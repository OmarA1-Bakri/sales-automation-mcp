/**
 * ConversationalResponder - Dynamic AI Response Service
 * 
 * Enables real-time, context-aware AI responses to incoming emails and LinkedIn messages.
 * Each response is specifically tailored to the conversation moment.
 * 
 * Flow:
 * 1. Incoming reply triggers handleIncomingReply()
 * 2. Load conversation history + lead context
 * 3. Load KnowledgeService context (persona, objections, case studies)
 * 4. Detect intent/sentiment of incoming message
 * 5. Generate contextual AI response
 * 6. Send via Lemlist API
 * 7. Store in conversation history for learning
 * 
 * Future: Migrate to Neo4j for relationship-based context retrieval
 */

import KnowledgeService from './KnowledgeService.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('ConversationalResponder');

// Intent categories for incoming messages
const INTENT_TYPES = {
  INTERESTED: 'interested',           // Wants to learn more
  OBJECTION: 'objection',             // Price, timing, competitor mention
  MEETING_REQUEST: 'meeting_request', // Wants to schedule
  NOT_INTERESTED: 'not_interested',   // Polite decline
  QUESTION: 'question',               // Asking for info
  OUT_OF_OFFICE: 'out_of_office',     // Auto-reply detection
  FOLLOW_UP: 'follow_up',             // Continuing conversation
  UNKNOWN: 'unknown'
};

// Sentiment classifications
const SENTIMENTS = {
  POSITIVE: 'positive',
  NEUTRAL: 'neutral', 
  NEGATIVE: 'negative',
  OBJECTION: 'objection'
};

class ConversationalResponder {
  /**
   * @param {object} db - Database instance with lead conversation methods
   * @param {object} aiProvider - AI provider (Anthropic/Gemini)
   * @param {object} providers - Provider instances for multi-channel support
   * @param {object} config - Configuration options
   */
  constructor(db, aiProvider, providers = {}, config = {}) {
    // P0 FIX: Initialize cleanup interval to null first (for safe cleanup on error)
    this._rateLimitCleanupInterval = null;

    try {
      this.db = db;
      this.ai = aiProvider;

      // Multi-channel providers
      this.lemlist = providers.lemlist || null;
      this.postmark = providers.postmark || null;      // Email fallback
      this.phantombuster = providers.phantombuster || null;  // LinkedIn automation
      this.heygen = providers.heygen || null;          // Video generation

      this.config = {
        responseDelayMs: config.responseDelayMs || 30000,  // 30s delay to seem human
        maxResponsesPerThread: config.maxResponsesPerThread || 5,
        excludedIntents: config.excludedIntents || ['not_interested', 'out_of_office'],
        requireReview: config.requireReview || false,
        senderName: config.senderName || 'Sales Team',
        senderRole: config.senderRole || 'Business Development',
        companyName: config.companyName || 'RTGS.global',
        senderEmail: config.senderEmail || process.env.POSTMARK_SENDER_EMAIL,
        model: config.model || 'claude-sonnet-4-20250514',
        enableVideo: config.enableVideo || false,  // Generate video responses for high-value leads
        videoThreshold: config.videoThreshold || 'meeting_request',  // Intent that triggers video
        // Rate limiting config
        rateLimitPerLeadPerHour: config.rateLimitPerLeadPerHour || 5,  // Max responses per lead/hour
        rateLimitWindowMs: config.rateLimitWindowMs || 3600000,  // 1 hour window
        ...config
      };

      // In-memory rate limiting state (per-lead response tracking)
      this._responseTracker = new Map();  // Map<leadEmail, Array<timestamp>>

      logger.info('ConversationalResponder initialized', {
        hasLemlist: !!this.lemlist,
        hasPostmark: !!this.postmark,
        hasPhantombuster: !!this.phantombuster,
        hasHeygen: !!this.heygen,
        enableVideo: this.config.enableVideo,
        rateLimitPerHour: this.config.rateLimitPerLeadPerHour
      });

      // P0 FIX: Move setInterval to end of constructor (after all initialization)
      // Cleanup old rate limit entries every 10 minutes
      this._rateLimitCleanupInterval = setInterval(() => {
        this._cleanupRateLimitTracker();
      }, 600000);
    } catch (error) {
      // P0 FIX: Clean up interval if initialization fails after it was created
      if (this._rateLimitCleanupInterval) {
        clearInterval(this._rateLimitCleanupInterval);
        this._rateLimitCleanupInterval = null;
      }
      throw error;
    }
  }

  /**
   * Check if rate limit allows a response for this lead
   * @param {string} leadEmail - Lead email to check
   * @returns {object} { allowed: boolean, remaining: number, resetInMs: number }
   */
  _checkRateLimit(leadEmail) {
    const now = Date.now();
    const windowStart = now - this.config.rateLimitWindowMs;

    // Get existing timestamps for this lead
    let timestamps = this._responseTracker.get(leadEmail) || [];

    // Filter to only timestamps within the window
    timestamps = timestamps.filter(ts => ts > windowStart);

    const count = timestamps.length;
    const limit = this.config.rateLimitPerLeadPerHour;
    const allowed = count < limit;

    // Calculate reset time (oldest timestamp expiry)
    const resetInMs = timestamps.length > 0
      ? Math.max(0, timestamps[0] + this.config.rateLimitWindowMs - now)
      : 0;

    return {
      allowed,
      remaining: Math.max(0, limit - count),
      count,
      limit,
      resetInMs
    };
  }

  /**
   * Track a response for rate limiting
   * @param {string} leadEmail - Lead email to track
   */
  _trackResponse(leadEmail) {
    const now = Date.now();
    const timestamps = this._responseTracker.get(leadEmail) || [];
    timestamps.push(now);
    this._responseTracker.set(leadEmail, timestamps);
  }

  /**
   * Cleanup old rate limit entries to prevent memory leaks
   * @private
   */
  _cleanupRateLimitTracker() {
    const now = Date.now();
    const windowStart = now - this.config.rateLimitWindowMs;
    let cleaned = 0;

    for (const [email, timestamps] of this._responseTracker.entries()) {
      const valid = timestamps.filter(ts => ts > windowStart);
      if (valid.length === 0) {
        this._responseTracker.delete(email);
        cleaned++;
      } else if (valid.length < timestamps.length) {
        this._responseTracker.set(email, valid);
      }
    }

    if (cleaned > 0) {
      logger.debug('Rate limit tracker cleanup', { entriesRemoved: cleaned });
    }
  }

  /**
   * Graceful shutdown - cleanup intervals
   */
  shutdown() {
    if (this._rateLimitCleanupInterval) {
      clearInterval(this._rateLimitCleanupInterval);
    }
    logger.info('ConversationalResponder shutdown');
  }

  /**
   * Main entry point - handle an incoming reply from webhook
   * @param {object} webhookData - Data from Lemlist webhook
   * @returns {object} Result of handling (queued, sent, skipped)
   */
  async handleIncomingReply(webhookData) {
    const {
      leadEmail,
      leadName,
      companyName,
      campaignId,
      enrollmentId,
      messageContent,
      subject,
      channel = 'email',
      threadId
    } = webhookData;

    logger.info('Handling incoming reply', { leadEmail, campaignId, channel });

    try {
      // Step 0: Check rate limit BEFORE any processing
      const rateLimit = this._checkRateLimit(leadEmail);
      if (!rateLimit.allowed) {
        logger.warn('Rate limit exceeded for lead', {
          leadEmail,
          count: rateLimit.count,
          limit: rateLimit.limit,
          resetInMs: rateLimit.resetInMs
        });
        return {
          status: 'skipped',
          reason: 'rate_limited',
          rateLimit: {
            remaining: rateLimit.remaining,
            resetInMinutes: Math.ceil(rateLimit.resetInMs / 60000)
          }
        };
      }

      // Step 1: Get or create conversation thread
      const conversation = this.db.getOrCreateLeadConversation(leadEmail, campaignId, {
        channel,
        leadName,
        companyName,
        enrollmentId,
        threadId
      });

      // Step 2: Check if we should respond (max responses limit)
      if (!this.db.canAIRespond(conversation.id, this.config.maxResponsesPerThread)) {
        logger.info('Max AI responses reached, skipping', { 
          conversationId: conversation.id,
          count: conversation.ai_responses_count 
        });
        return { status: 'skipped', reason: 'max_responses_reached' };
      }

      // Step 3: Detect intent and sentiment
      const { intent, sentiment, objectionType, competitor } = await this._detectIntent(messageContent);
      
      // Step 4: Check if intent is excluded
      if (this.config.excludedIntents.includes(intent)) {
        logger.info('Intent excluded from auto-response', { intent, leadEmail });
        
        // Still record the message for history
        this.db.addLeadMessage(conversation.id, 'inbound', messageContent, {
          subject,
          messageType: 'reply',
          sentiment,
          detectedIntent: intent
        });
        
        return { status: 'skipped', reason: 'excluded_intent', intent };
      }

      // Step 5: Store inbound message
      const inboundMessage = this.db.addLeadMessage(conversation.id, 'inbound', messageContent, {
        subject,
        messageType: 'reply',
        sentiment,
        detectedIntent: intent
      });

      // Step 6: Load conversation history
      const conversationHistory = this.db.getLeadConversationHistory(leadEmail, campaignId);

      // Step 7: Load knowledge context
      const knowledgeContext = await this._buildKnowledgeContext({
        leadName,
        companyName,
        intent,
        sentiment,
        objectionType,
        competitor
      });

      // Step 8: Generate AI response (with timeout and error handling)
      const AI_GENERATION_TIMEOUT = 30000; // 30 seconds
      let aiResponse;

      try {
        const generationPromise = this._generateResponse({
          lead: { email: leadEmail, name: leadName, company: companyName },
          incomingMessage: messageContent,
          conversationHistory,
          knowledgeContext,
          intent,
          sentiment
        });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('AI generation timeout')), AI_GENERATION_TIMEOUT)
        );

        aiResponse = await Promise.race([generationPromise, timeoutPromise]);
      } catch (aiError) {
        logger.error('AI response generation failed', {
          leadEmail,
          campaignId,
          intent,
          error: aiError.message
        });

        // Store the failed attempt for review
        this.db.addLeadMessage(conversation.id, 'inbound', messageContent, {
          subject,
          messageType: 'reply_pending_manual',
          sentiment,
          detectedIntent: intent,
          knowledgeUsed: JSON.stringify({ aiError: aiError.message })
        });

        // Queue for manual review instead of failing silently
        return {
          status: 'queued_for_review',
          reason: 'ai_generation_failed',
          error: aiError.message,
          conversationId: conversation.id,
          intent,
          requiresManualResponse: true
        };
      }

      // Step 8.5: Validate AI response content
      const validation = this._validateAIResponse(aiResponse, { leadEmail, intent });
      if (!validation.valid) {
        logger.error('AI response failed validation, skipping send', {
          leadEmail,
          intent,
          errors: validation.errors
        });

        // Still record the attempt but don't send
        this.db.addLeadMessage(conversation.id, 'outbound', aiResponse.content, {
          subject: aiResponse.subject,
          messageType: 'ai_reply_blocked',
          aiGenerated: true,
          knowledgeUsed: JSON.stringify({ blocked: true, errors: validation.errors })
        });

        return {
          status: 'blocked',
          reason: 'validation_failed',
          errors: validation.errors,
          conversationId: conversation.id
        };
      }

      // Step 9: Apply human-like delay if configured
      if (this.config.responseDelayMs > 0 && !this.config.requireReview) {
        logger.info('Delaying response to seem human', { delayMs: this.config.responseDelayMs });
        await this._delay(this.config.responseDelayMs);
      }

      // Step 10: Send or queue for review
      let result;
      if (this.config.requireReview) {
        result = await this._queueForReview(conversation.id, aiResponse, knowledgeContext);
      } else {
        result = await this._sendResponse(leadEmail, campaignId, aiResponse, channel, threadId);
      }

      // Step 11: Store outbound message
      const outboundMessage = this.db.addLeadMessage(conversation.id, 'outbound', aiResponse.content, {
        subject: aiResponse.subject,
        messageType: 'ai_reply',
        aiGenerated: true,
        knowledgeUsed: knowledgeContext.usedKnowledge
      });

      // Step 12: Track knowledge usage for learning
      if (knowledgeContext.usedKnowledge) {
        for (const [type, items] of Object.entries(knowledgeContext.usedKnowledge)) {
          for (const item of items) {
            this.db.trackKnowledgeUsage(outboundMessage.id, type, item.key, item.relevance);
          }
        }
      }

      // Step 13: Track response for rate limiting (after successful send)
      this._trackResponse(leadEmail);

      logger.info('Successfully handled reply', {
        conversationId: conversation.id,
        intent,
        responseLength: aiResponse.content.length,
        sent: !this.config.requireReview
      });

      return {
        status: this.config.requireReview ? 'queued_for_review' : 'sent',
        conversationId: conversation.id,
        messageId: outboundMessage.id,
        intent,
        sentiment
      };

    } catch (error) {
      logger.error('Failed to handle incoming reply', { 
        error: error.message, 
        leadEmail, 
        campaignId 
      });
      throw error;
    }
  }

  /**
   * Detect intent and sentiment from incoming message
   * @private
   */
  async _detectIntent(messageContent) {
    const contentLower = messageContent.toLowerCase();
    
    // Out of office detection
    const oooPatterns = [
      /out of (the )?office/i,
      /on (vacation|holiday|leave|pto)/i,
      /auto(-| )?reply/i,
      /automatic reply/i,
      /away from (my )?(email|desk)/i,
      /limited access to email/i,
      /maternity|paternity leave/i
    ];
    
    if (oooPatterns.some(p => p.test(contentLower))) {
      return { intent: INTENT_TYPES.OUT_OF_OFFICE, sentiment: SENTIMENTS.NEUTRAL };
    }

    // Not interested detection
    const notInterestedPatterns = [
      /not interested/i,
      /no thanks/i,
      /please remove/i,
      /unsubscribe/i,
      /stop (emailing|contacting)/i,
      /not the right (time|fit)/i,
      /we('re| are) (all )?set/i,
      /already have a solution/i
    ];
    
    if (notInterestedPatterns.some(p => p.test(contentLower))) {
      return { intent: INTENT_TYPES.NOT_INTERESTED, sentiment: SENTIMENTS.NEGATIVE };
    }

    // Meeting request detection
    const meetingPatterns = [
      /let('s|us) (set up|schedule|book)/i,
      /can we (talk|chat|meet|connect)/i,
      /free (for a|to) (call|chat)/i,
      /what('s| is) your availability/i,
      /send me (some |a )?times/i,
      /calendar link/i,
      /15 minutes/i,
      /quick call/i
    ];
    
    if (meetingPatterns.some(p => p.test(contentLower))) {
      return { intent: INTENT_TYPES.MEETING_REQUEST, sentiment: SENTIMENTS.POSITIVE };
    }

    // Objection detection with type extraction
    const objectionPatterns = {
      price: [/too expensive/i, /cost (too|is) (high|much)/i, /budget/i, /pricing/i],
      timing: [/not (the right|a good) time/i, /too busy/i, /maybe (later|next)/i, /q[1-4]/i],
      competitor: [/already (use|using|have)/i, /current (solution|provider|vendor)/i, /swift/i, /stripe/i],
      trust: [/never heard of/i, /who are you/i, /how (long|big)/i, /references/i]
    };

    for (const [type, patterns] of Object.entries(objectionPatterns)) {
      if (patterns.some(p => p.test(contentLower))) {
        // Extract competitor name if mentioned
        const competitorMatch = contentLower.match(/(?:using|use|have|with)\s+(\w+)/i);
        return { 
          intent: INTENT_TYPES.OBJECTION, 
          sentiment: SENTIMENTS.OBJECTION,
          objectionType: type,
          competitor: competitorMatch ? competitorMatch[1] : null
        };
      }
    }

    // Question detection
    const questionPatterns = [
      /\?$/,
      /can you (tell|explain|share)/i,
      /how (does|do|would)/i,
      /what (is|are|does)/i,
      /could you (send|provide)/i,
      /more (info|information|details)/i
    ];
    
    if (questionPatterns.some(p => p.test(contentLower))) {
      return { intent: INTENT_TYPES.QUESTION, sentiment: SENTIMENTS.NEUTRAL };
    }

    // Interest detection
    const interestPatterns = [
      /sounds (good|interesting|great)/i,
      /tell me more/i,
      /i('d| would) (like|love) to/i,
      /interested in/i,
      /this (sounds|looks|seems)/i,
      /intriguing/i
    ];
    
    if (interestPatterns.some(p => p.test(contentLower))) {
      return { intent: INTENT_TYPES.INTERESTED, sentiment: SENTIMENTS.POSITIVE };
    }

    // Default to follow-up with neutral sentiment
    return { intent: INTENT_TYPES.FOLLOW_UP, sentiment: SENTIMENTS.NEUTRAL };
  }

  /**
   * Build knowledge context based on lead and detected intent
   * @private
   */
  async _buildKnowledgeContext({ leadName, companyName, intent, sentiment, objectionType, competitor }) {
    const context = {
      retrievedAt: new Date().toISOString(),
      usedKnowledge: {}
    };

    try {
      // Base context for persona (defaults to 'executive')
      const personaContext = await KnowledgeService.getContextForPersona('executive', {
        includeCompetitive: true,
        includeLearnings: true
      });
      
      context.base = personaContext.knowledge;
      context.usedKnowledge.base = [{ key: 'persona_context', relevance: 1.0 }];

      // Objection-specific context
      if (intent === INTENT_TYPES.OBJECTION && objectionType) {
        const objectionContext = await KnowledgeService.getObjectionContext(objectionType, competitor);
        context.objection = objectionContext.knowledge;
        context.usedKnowledge.objection = [{ key: objectionType, relevance: 1.0 }];
        
        if (competitor) {
          context.usedKnowledge.competitor = [{ key: competitor, relevance: 0.9 }];
        }
      }

      // Relevant case study for interest/questions
      if (intent === INTENT_TYPES.INTERESTED || intent === INTENT_TYPES.QUESTION) {
        try {
          const caseStudy = await KnowledgeService.getCaseStudyForPainPoint('global_expansion');
          if (caseStudy) {
            context.relevantCaseStudy = caseStudy;
            context.usedKnowledge.case_study = [{ key: 'global_expansion', relevance: 0.8 }];
          }
        } catch (e) {
          // Case study optional
        }
      }

    } catch (error) {
      logger.warn('Failed to load some knowledge context', { error: error.message });
    }

    return context;
  }

  /**
   * Generate AI response using the configured provider
   * @private
   */
  async _generateResponse({ lead, incomingMessage, conversationHistory, knowledgeContext, intent, sentiment }) {
    const systemPrompt = this._buildSystemPrompt(lead, knowledgeContext, intent);
    const userPrompt = this._buildUserPrompt(lead, incomingMessage, conversationHistory, intent);

    logger.debug('Generating AI response', { intent, historyLength: conversationHistory.length });

    const response = await this.ai.generateText(
      systemPrompt,
      userPrompt,
      this.config.model
    );

    // Extract content from response
    const content = this._extractContent(response);
    
    // Generate subject line for emails if needed
    const subject = intent === INTENT_TYPES.MEETING_REQUEST 
      ? `Re: Let's connect - ${this.config.companyName}`
      : `Re: ${lead.company || 'Your inquiry'}`;

    return {
      content,
      subject,
      model: this.config.model,
      tokensUsed: response.usage?.total_tokens || 0
    };
  }

  /**
   * Build system prompt for AI
   * @private
   */
  _buildSystemPrompt(lead, knowledgeContext, intent) {
    const intentGuidance = this._getIntentGuidance(intent);
    
    let knowledgeSection = '';
    if (knowledgeContext.base) {
      if (knowledgeContext.base.valuePropositions) {
        knowledgeSection += `\nVALUE PROPOSITIONS:\n${knowledgeContext.base.valuePropositions}\n`;
      }
      if (knowledgeContext.base.whatWorks) {
        knowledgeSection += `\nWHAT WORKS IN OUTREACH:\n${knowledgeContext.base.whatWorks}\n`;
      }
    }
    
    if (knowledgeContext.objection?.battleCards) {
      knowledgeSection += `\nCOMPETITIVE BATTLE CARDS:\n${knowledgeContext.objection.battleCards}\n`;
    }
    
    if (knowledgeContext.relevantCaseStudy) {
      knowledgeSection += `\nRELEVANT CASE STUDY:\n${knowledgeContext.relevantCaseStudy}\n`;
    }

    return `You are ${this.config.senderName}, a ${this.config.senderRole} at ${this.config.companyName}, responding to a sales conversation.

CRITICAL RULES:
1. You ARE the sender - respond as if you are the human sales rep
2. NEVER reveal you are AI - respond naturally as the person would
3. Keep responses concise (2-3 short paragraphs maximum)
4. Match the tone of their message (formal/casual)
5. Always include a clear, single call-to-action
6. Be helpful and authentic, not salesy

CONTEXT:
- Lead: ${lead.name || 'Contact'} at ${lead.company || 'their company'}
- Detected Intent: ${intent}
${knowledgeSection}

${intentGuidance}

RESPONSE FORMAT:
- Write a natural email/message response
- No subject line needed (will be added separately)
- No signature needed (will be added separately)
- Do NOT include "Hi [Name]," greeting if the conversation is already ongoing`;
  }

  /**
   * Get intent-specific guidance for the AI
   * @private
   */
  _getIntentGuidance(intent) {
    const guidance = {
      [INTENT_TYPES.INTERESTED]: `
GUIDANCE FOR INTERESTED LEAD:
- They're warm! Capitalize on this momentum
- Propose a specific next step (15-min call, brief demo, case study)
- Include a calendar link or specific time options
- Reference a relevant success story briefly`,

      [INTENT_TYPES.OBJECTION]: `
GUIDANCE FOR OBJECTION:
- Acknowledge their concern genuinely first
- Provide evidence-based response (case study, ROI data, comparison)
- Don't be defensive - be consultative
- Offer to address specific concerns on a quick call`,

      [INTENT_TYPES.MEETING_REQUEST]: `
GUIDANCE FOR MEETING REQUEST:
- Express enthusiasm (briefly, not over the top)
- Confirm the meeting request
- Provide 2-3 specific time options or calendar link
- Mention what you'll cover briefly`,

      [INTENT_TYPES.QUESTION]: `
GUIDANCE FOR QUESTION:
- Answer their specific question directly first
- Keep the explanation clear and jargon-free
- Pivot naturally to how this addresses their needs
- Suggest a call for deeper dive if complex`,

      [INTENT_TYPES.FOLLOW_UP]: `
GUIDANCE FOR FOLLOW-UP:
- Reference the previous conversation naturally
- Move the conversation forward
- Provide new value or insight
- Include a clear next step`
    };

    return guidance[intent] || guidance[INTENT_TYPES.FOLLOW_UP];
  }

  /**
   * Build user prompt with conversation context
   * @private
   */
  _buildUserPrompt(lead, incomingMessage, conversationHistory, intent) {
    let historySection = '';
    
    if (conversationHistory && conversationHistory.length > 0) {
      const recentHistory = conversationHistory.slice(-6); // Last 6 messages for context
      historySection = 'CONVERSATION HISTORY:\n';
      for (const msg of recentHistory) {
        const direction = msg.direction === 'outbound' ? 'You (sent)' : `${lead.name || 'Lead'} (received)`;
        historySection += `${direction}: ${msg.content.substring(0, 500)}${msg.content.length > 500 ? '...' : ''}\n\n`;
      }
    }

    return `${historySection}
INCOMING MESSAGE FROM ${lead.name || 'LEAD'}:
"${incomingMessage}"

Write a response to this message. Remember to be ${lead.name ? `personal to ${lead.name}` : 'professional'} and keep it concise.`;
  }

  /**
   * Extract content from AI response
   * @private
   */
  _extractContent(response) {
    if (typeof response === 'string') return response;
    if (response.content) {
      if (Array.isArray(response.content)) {
        return response.content.map(c => c.text || c).join('');
      }
      return response.content;
    }
    if (response.text) return response.text;
    return JSON.stringify(response);
  }

  /**
   * Send response via Lemlist
   * @private
   */
  async _sendResponse(leadEmail, campaignId, aiResponse, channel, threadId) {
    const result = { sent: false, channel: null, provider: null };
    
    try {
      // Route by channel type
      if (channel === 'linkedin') {
        return await this._sendLinkedInResponse(leadEmail, aiResponse, threadId);
      }
      
      // Email channel - try Lemlist first, then Postmark fallback
      if (this.lemlist && typeof this.lemlist.sendReply === 'function') {
        try {
          await this.lemlist.sendReply(leadEmail, campaignId, aiResponse.content, {
            channel,
            threadId,
            subject: aiResponse.subject
          });
          logger.info('Response sent via Lemlist', { leadEmail, campaignId });
          return { sent: true, channel: 'email', provider: 'lemlist' };
        } catch (lemlistError) {
          logger.warn('Lemlist send failed, trying Postmark fallback', { 
            error: lemlistError.message 
          });
        }
      }
      
      // Postmark fallback for email
      if (this.postmark) {
        try {
          await this.postmark.send({
            to: leadEmail,
            subject: aiResponse.subject || 'Re: Your inquiry',
            html: this._formatEmailHtml(aiResponse.content),
            text: aiResponse.content,
            from: this.config.senderEmail,
            replyTo: this.config.senderEmail,
            tag: `campaign-${campaignId}`,
            metadata: {
              campaignId,
              threadId,
              aiGenerated: true
            }
          });
          logger.info('Response sent via Postmark fallback', { leadEmail, campaignId });
          return { sent: true, channel: 'email', provider: 'postmark' };
        } catch (postmarkError) {
          logger.error('Postmark send failed', { error: postmarkError.message });
        }
      }
      
      logger.warn('No email provider available to send response', { leadEmail });
      return { sent: false, reason: 'no_email_provider_available' };
      
    } catch (error) {
      logger.error('Failed to send response', { 
        error: error.message, 
        leadEmail, 
        channel 
      });
      throw error;
    }
  }

  /**
   * Queue response for human review
   * @private
   */

  /**
   * Send response via LinkedIn (PhantomBuster)
   * @private
   */
  async _sendLinkedInResponse(leadEmail, aiResponse, threadId) {
    if (!this.phantombuster) {
      logger.warn('PhantomBuster not configured for LinkedIn responses');
      return { sent: false, reason: 'phantombuster_not_configured' };
    }

    try {
      // PhantomBuster requires LinkedIn profile URL, try to get from lead data
      const leadProfile = await this._getLinkedInProfile(leadEmail);
      
      if (!leadProfile?.linkedinUrl) {
        logger.warn('No LinkedIn profile URL for lead', { leadEmail });
        return { sent: false, reason: 'no_linkedin_profile' };
      }

      // Send message via PhantomBuster
      await this.phantombuster.sendMessage({
        profileUrl: leadProfile.linkedinUrl,
        message: aiResponse.content,
        sessionCookie: process.env.LINKEDIN_SESSION_COOKIE
      });

      logger.info('Response sent via PhantomBuster LinkedIn', { 
        leadEmail, 
        profileUrl: leadProfile.linkedinUrl 
      });
      
      return { sent: true, channel: 'linkedin', provider: 'phantombuster' };
    } catch (error) {
      logger.error('PhantomBuster LinkedIn send failed', { 
        error: error.message,
        leadEmail 
      });
      return { sent: false, reason: 'phantombuster_error', error: error.message };
    }
  }

  /**
   * Get LinkedIn profile URL for a lead
   * @private
   */
  async _getLinkedInProfile(leadEmail) {
    try {
      const result = this.db.prepare(`
        SELECT linkedin_url, first_name, last_name, company_name
        FROM imported_contacts 
        WHERE email = ?
      `).get(leadEmail);
      
      return result ? {
        linkedinUrl: result.linkedin_url,
        firstName: result.first_name,
        lastName: result.last_name,
        company: result.company_name
      } : null;
    } catch (error) {
      logger.warn('Failed to get LinkedIn profile', { leadEmail, error: error.message });
      return null;
    }
  }

  /**
   * Generate personalized video response via HeyGen
   * Use for high-value interactions (meeting requests, interested leads)
   */
  async generateVideoResponse(conversationId, leadEmail, customScript = null) {
    if (!this.heygen) {
      throw new Error('HeyGen provider not configured');
    }

    if (!this.config.enableVideo) {
      logger.info('Video generation disabled in config');
      return { generated: false, reason: 'video_disabled' };
    }

    try {
      // Get conversation context
      const conversation = this.db.prepare(`
        SELECT * FROM lead_conversations WHERE id = ?
      `).get(conversationId);

      if (!conversation) {
        throw new Error(`Conversation ${conversationId} not found`);
      }

      // Get lead details for personalization
      const leadDetails = await this._getLinkedInProfile(leadEmail) || {};
      
      // Generate video script if not provided
      const script = customScript || await this._generateVideoScript(conversation, leadDetails);

      // Generate video via HeyGen
      const videoResult = await this.heygen.generateVideo({
        script,
        avatarId: process.env.HEYGEN_AVATAR_ID || 'default',
        voiceId: process.env.HEYGEN_VOICE_ID || 'default',
        title: `Personalized message for ${leadDetails.firstName || 'you'}`,
        test: process.env.NODE_ENV !== 'production'
      });

      logger.info('Video generation initiated', {
        conversationId,
        leadEmail,
        videoId: videoResult.videoId
      });

      // Store video reference in conversation
      this.db.prepare(`
        UPDATE lead_conversations 
        SET metadata = json_set(COALESCE(metadata, '{}'), '$.lastVideoId', ?)
        WHERE id = ?
      `).run(videoResult.videoId, conversationId);

      return {
        generated: true,
        videoId: videoResult.videoId,
        status: videoResult.status,
        estimatedDuration: videoResult.estimatedDuration
      };

    } catch (error) {
      logger.error('Video generation failed', { 
        conversationId, 
        leadEmail, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Generate personalized video script using AI
   * @private
   */
  async _generateVideoScript(conversation, leadDetails) {
    const prompt = `Generate a short, personalized video script (30-60 seconds when spoken) for a sales follow-up.

LEAD INFO:
- Name: ${leadDetails.firstName || 'there'} ${leadDetails.lastName || ''}
- Company: ${leadDetails.company || 'your company'}

CONTEXT:
- This is a follow-up to their ${conversation.status === 'meeting_scheduled' ? 'scheduled meeting' : 'interest in our solution'}
- Keep it warm, professional, and action-oriented
- Reference their specific situation if known

GUIDELINES:
- Start with a warm greeting using their first name
- Be conversational, not scripted-sounding
- Include one clear call-to-action
- End positively

Generate ONLY the script text, no stage directions or notes.`;

    // P0 FIX: Add timeout protection to video script generation
    const SCRIPT_GENERATION_TIMEOUT = 15000; // 15 seconds

    try {
      const generationPromise = this.ai.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }]
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Video script generation timeout')), SCRIPT_GENERATION_TIMEOUT)
      );

      const response = await Promise.race([generationPromise, timeoutPromise]);
      return response.content[0].text;
    } catch (error) {
      logger.error('Video script generation failed', {
        error: error.message,
        leadEmail: leadDetails?.email,
        conversationId: conversation?.id
      });

      // Return fallback template script
      const firstName = leadDetails?.firstName || 'there';
      return `Hi ${firstName},\n\nThank you for your interest! I wanted to personally reach out to discuss how we can help with your cross-border payment needs.\n\nI'd love to schedule a brief call to learn more about your specific requirements and show you what we've built.\n\nLooking forward to connecting!`;
    }
  }

  /**
   * Validate AI response content before sending
   * Checks for inappropriate content, length, and professionalism
   * @param {object} aiResponse - { content, subject } from AI
   * @param {object} context - { leadEmail, intent } for logging
   * @returns {object} { valid: boolean, errors: string[], warnings: string[] }
   */
  _validateAIResponse(aiResponse, context = {}) {
    const errors = [];
    const warnings = [];
    const content = aiResponse.content || '';

    // Check for empty or very short response
    if (!content || content.trim().length < 20) {
      errors.push('Response is too short (minimum 20 characters)');
    }

    // Check for excessive length (>2000 chars may be too long for email)
    if (content.length > 2000) {
      warnings.push(`Response is quite long (${content.length} chars), consider shortening`);
    }

    // Check for potentially sensitive information patterns
    const sensitivePatterns = [
      /\b(?:password|secret|api[_-]?key|access[_-]?token)\s*[:=]\s*\S+/gi,
      /\b(?:ssn|social\s*security)\s*[:=]?\s*\d{3}[-\s]?\d{2}[-\s]?\d{4}/gi,
      /\b(?:credit\s*card|card\s*number)\s*[:=]?\s*\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}/gi
    ];

    for (const pattern of sensitivePatterns) {
      if (pattern.test(content)) {
        errors.push('Response may contain sensitive information (credential-like patterns detected)');
        break;
      }
    }

    // Check for competitor bashing or unprofessional language
    const unprofessionalPatterns = [
      /\b(?:sucks?|terrible|worst|hate|stupid|idiot)\b/gi,
      /\b(?:f+u+c+k|sh+i+t|a+ss+|damn|hell)\b/gi
    ];

    for (const pattern of unprofessionalPatterns) {
      if (pattern.test(content)) {
        errors.push('Response contains unprofessional or inappropriate language');
        break;
      }
    }

    // Check for promises we shouldn't make
    const riskyPromisePatterns = [
      /\b(?:guarantee|100%\s*(?:success|return)|risk[- ]free)\b/gi,
      /\b(?:unlimited|forever\s*free)\b/gi
    ];

    for (const pattern of riskyPromisePatterns) {
      if (pattern.test(content)) {
        warnings.push('Response may contain risky promises or guarantees');
        break;
      }
    }

    // Check for off-topic indicators (generic placeholders)
    const placeholderPatterns = [
      /\[(?:insert|add|your)\s+\w+\s*here\]/gi,
      /\{(?:placeholder|todo)\}/gi,
      /Lorem ipsum/gi
    ];

    for (const pattern of placeholderPatterns) {
      if (pattern.test(content)) {
        errors.push('Response contains placeholder text');
        break;
      }
    }

    // Log validation results
    if (errors.length > 0 || warnings.length > 0) {
      logger.warn('AI response validation issues', {
        leadEmail: context.leadEmail,
        intent: context.intent,
        errors,
        warnings,
        contentLength: content.length
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Format plain text email content to HTML
   * @private
   */
  _formatEmailHtml(content) {
    // Convert line breaks to paragraphs
    const paragraphs = content
      .split(/\n\n+/)
      .map(p => p.trim())
      .filter(p => p)
      .map(p => `<p style="margin: 0 0 16px 0; line-height: 1.6;">${p.replace(/\n/g, '<br>')}</p>`)
      .join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 14px; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  ${paragraphs}
  <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
    <p style="margin: 0;">${this.config.senderName}</p>
    <p style="margin: 4px 0 0 0;">${this.config.senderRole} | ${this.config.companyName}</p>
  </div>
</body>
</html>`;
  }

  /**
   * Check if video should be generated for this interaction
   * Based on intent and lead value
   */
  shouldGenerateVideo(intent, leadScore = 0) {
    if (!this.config.enableVideo || !this.heygen) {
      return false;
    }

    const highValueIntents = ['meeting_request', 'interested'];
    const threshold = this.config.videoThreshold;

    // Always generate for meeting requests if configured
    if (threshold === 'meeting_request' && intent === 'meeting_request') {
      return true;
    }

    // Generate for high-value leads showing interest
    if (highValueIntents.includes(intent) && leadScore >= 70) {
      return true;
    }

    return false;
  }

  async _queueForReview(conversationId, aiResponse, knowledgeContext) {
    // TODO: Implement review queue (could be a database table or external service)
    logger.info('Response queued for review', { 
      conversationId, 
      responseLength: aiResponse.content.length 
    });
    return { queued: true, conversationId };
  }

  /**
   * Delay helper for human-like response timing
   * @private
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default ConversationalResponder;
export { ConversationalResponder, INTENT_TYPES, SENTIMENTS };
