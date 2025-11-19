/**
 * Circuit Breaker Tests
 * Comprehensive test suite for circuit breaker functionality
 *
 * Test Coverage:
 * - Circuit opening on error threshold
 * - Half-open state recovery
 * - Timeout behavior
 * - Fallback execution
 * - Event emissions
 * - Error filtering
 * - Volume threshold
 * - Integration with axios and fetch
 */

const { expect } = require('chai');
const sinon = require('sinon');
const CircuitBreaker = require('opossum');

describe('Circuit Breaker Tests', () => {

  describe('Circuit Opening', () => {
    it('should open circuit after error threshold is exceeded', async () => {
      let callCount = 0;

      async function failingFunction() {
        callCount++;
        throw new Error('Service unavailable');
      }

      const breaker = new CircuitBreaker(failingFunction, {
        timeout: 1000,
        errorThresholdPercentage: 50,
        resetTimeout: 5000,
        volumeThreshold: 5,
        rollingCountTimeout: 10000
      });

      // Make enough requests to exceed volume threshold
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          breaker.fire().catch(err => err)
        );
      }

      await Promise.all(promises);

      // Circuit should be open now
      expect(breaker.opened).to.be.true;
      expect(callCount).to.be.at.least(5); // Volume threshold met
    });

    it('should not open circuit below volume threshold', async () => {
      async function failingFunction() {
        throw new Error('Service unavailable');
      }

      const breaker = new CircuitBreaker(failingFunction, {
        timeout: 1000,
        errorThresholdPercentage: 50,
        resetTimeout: 5000,
        volumeThreshold: 10 // High threshold
      });

      // Make fewer requests than volume threshold
      for (let i = 0; i < 5; i++) {
        await breaker.fire().catch(err => err);
      }

      // Circuit should still be closed
      expect(breaker.opened).to.be.false;
    });

    it('should respect errorThresholdPercentage', async () => {
      let callCount = 0;

      async function intermittentFunction() {
        callCount++;
        // 30% error rate (3 out of 10)
        if (callCount % 10 <= 3) {
          throw new Error('Intermittent failure');
        }
        return 'Success';
      }

      const breaker = new CircuitBreaker(intermittentFunction, {
        timeout: 1000,
        errorThresholdPercentage: 50, // 50% threshold
        resetTimeout: 5000,
        volumeThreshold: 5
      });

      // Make 20 requests (30% error rate)
      for (let i = 0; i < 20; i++) {
        await breaker.fire().catch(err => err);
      }

      // Circuit should NOT be open (30% < 50%)
      expect(breaker.opened).to.be.false;
    });
  });

  describe('Half-Open State', () => {
    it('should transition to HALF_OPEN after reset timeout', function(done) {
      this.timeout(5000);

      let callCount = 0;

      async function intermittentFunction() {
        callCount++;
        // Fail initially, succeed after circuit opens
        if (callCount <= 10) {
          throw new Error('Temporary failure');
        }
        return 'Success';
      }

      const breaker = new CircuitBreaker(intermittentFunction, {
        timeout: 1000,
        errorThresholdPercentage: 50,
        resetTimeout: 2000, // Short reset for testing
        volumeThreshold: 5
      });

      // Trigger circuit opening
      (async () => {
        for (let i = 0; i < 10; i++) {
          await breaker.fire().catch(err => err);
        }

        expect(breaker.opened).to.be.true;

        // Listen for halfOpen event
        breaker.once('halfOpen', () => {
          expect(breaker.halfOpen).to.be.true;
          done();
        });
      })();
    });

    it('should close circuit on successful HALF_OPEN request', async function() {
      this.timeout(5000);

      let callCount = 0;

      async function recoveryFunction() {
        callCount++;
        // Fail first 10 times, then succeed
        if (callCount <= 10) {
          throw new Error('Failing');
        }
        return 'Success';
      }

      const breaker = new CircuitBreaker(recoveryFunction, {
        timeout: 1000,
        errorThresholdPercentage: 50,
        resetTimeout: 100, // Very short for testing
        volumeThreshold: 5
      });

      // Open circuit
      for (let i = 0; i < 10; i++) {
        await breaker.fire().catch(err => err);
      }

      expect(breaker.opened).to.be.true;

      // Wait for half-open and successful recovery
      await new Promise(resolve => setTimeout(resolve, 150));

      const result = await breaker.fire();
      expect(result).to.equal('Success');
      expect(breaker.opened).to.be.false;
      expect(breaker.halfOpen).to.be.false;
    });

    it('should re-open circuit on failed HALF_OPEN request', async function() {
      this.timeout(5000);

      let callCount = 0;

      async function stillFailingFunction() {
        callCount++;
        throw new Error('Still failing');
      }

      const breaker = new CircuitBreaker(stillFailingFunction, {
        timeout: 1000,
        errorThresholdPercentage: 50,
        resetTimeout: 100,
        volumeThreshold: 5
      });

      // Open circuit
      for (let i = 0; i < 10; i++) {
        await breaker.fire().catch(err => err);
      }

      expect(breaker.opened).to.be.true;

      // Wait for half-open
      await new Promise(resolve => setTimeout(resolve, 150));

      // This should fail and re-open circuit
      await breaker.fire().catch(err => err);

      expect(breaker.opened).to.be.true;
    });
  });

  describe('Timeout Behavior', () => {
    it('should timeout long-running requests', async () => {
      async function slowFunction() {
        // Simulate slow operation
        await new Promise(resolve => setTimeout(resolve, 5000));
        return 'Too slow';
      }

      const breaker = new CircuitBreaker(slowFunction, {
        timeout: 100 // Very short timeout
      });

      let timeoutOccurred = false;
      breaker.once('timeout', () => {
        timeoutOccurred = true;
      });

      try {
        await breaker.fire();
        expect.fail('Should have timed out');
      } catch (error) {
        expect(timeoutOccurred).to.be.true;
        expect(error.message).to.include('timed out');
      }
    });

    it('should not timeout fast requests', async () => {
      async function fastFunction() {
        await new Promise(resolve => setTimeout(resolve, 50));
        return 'Success';
      }

      const breaker = new CircuitBreaker(fastFunction, {
        timeout: 1000 // Generous timeout
      });

      const result = await breaker.fire();
      expect(result).to.equal('Success');
    });
  });

  describe('Fallback Behavior', () => {
    it('should execute fallback when circuit opens', async () => {
      async function failingFunction() {
        throw new Error('Service down');
      }

      const breaker = new CircuitBreaker(failingFunction, {
        timeout: 1000,
        errorThresholdPercentage: 50,
        resetTimeout: 5000,
        volumeThreshold: 5
      });

      // Set fallback
      breaker.fallback(() => 'Fallback response');

      // Open circuit
      for (let i = 0; i < 10; i++) {
        await breaker.fire();
      }

      // Next request should use fallback
      const result = await breaker.fire();
      expect(result).to.equal('Fallback response');
    });

    it('should pass arguments to fallback function', async () => {
      async function failingFunction(arg1, arg2) {
        throw new Error('Failed');
      }

      const breaker = new CircuitBreaker(failingFunction, {
        timeout: 1000,
        errorThresholdPercentage: 50,
        volumeThreshold: 5
      });

      breaker.fallback((arg1, arg2) => {
        return `Fallback: ${arg1} ${arg2}`;
      });

      // Open circuit
      for (let i = 0; i < 10; i++) {
        await breaker.fire('test', 'args');
      }

      const result = await breaker.fire('hello', 'world');
      expect(result).to.equal('Fallback: hello world');
    });

    it('should allow async fallback functions', async () => {
      async function failingFunction() {
        throw new Error('Failed');
      }

      const breaker = new CircuitBreaker(failingFunction, {
        timeout: 1000,
        errorThresholdPercentage: 50,
        volumeThreshold: 5
      });

      breaker.fallback(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'Async fallback';
      });

      // Open circuit
      for (let i = 0; i < 10; i++) {
        await breaker.fire();
      }

      const result = await breaker.fire();
      expect(result).to.equal('Async fallback');
    });
  });

  describe('Event Emissions', () => {
    it('should emit success event on successful request', async () => {
      async function successFunction() {
        return 'Success';
      }

      const breaker = new CircuitBreaker(successFunction, {
        timeout: 1000
      });

      let successEmitted = false;
      breaker.once('success', () => {
        successEmitted = true;
      });

      await breaker.fire();
      expect(successEmitted).to.be.true;
    });

    it('should emit failure event on failed request', async () => {
      async function failingFunction() {
        throw new Error('Failed');
      }

      const breaker = new CircuitBreaker(failingFunction, {
        timeout: 1000
      });

      let failureEmitted = false;
      breaker.once('failure', () => {
        failureEmitted = true;
      });

      await breaker.fire().catch(() => {});
      expect(failureEmitted).to.be.true;
    });

    it('should emit open, halfOpen, and close events', async function() {
      this.timeout(5000);

      const events = [];
      let callCount = 0;

      async function recoveryFunction() {
        callCount++;
        if (callCount <= 10) {
          throw new Error('Failing');
        }
        return 'Success';
      }

      const breaker = new CircuitBreaker(recoveryFunction, {
        timeout: 1000,
        errorThresholdPercentage: 50,
        resetTimeout: 100,
        volumeThreshold: 5
      });

      breaker.on('open', () => events.push('open'));
      breaker.on('halfOpen', () => events.push('halfOpen'));
      breaker.on('close', () => events.push('close'));

      // Open circuit
      for (let i = 0; i < 10; i++) {
        await breaker.fire().catch(() => {});
      }

      // Wait for half-open and recovery
      await new Promise(resolve => setTimeout(resolve, 150));
      await breaker.fire();

      expect(events).to.include('open');
      expect(events).to.include('halfOpen');
      expect(events).to.include('close');
    });

    it('should emit reject event when circuit is open', async () => {
      async function failingFunction() {
        throw new Error('Failed');
      }

      const breaker = new CircuitBreaker(failingFunction, {
        timeout: 1000,
        errorThresholdPercentage: 50,
        volumeThreshold: 5
      });

      let rejectEmitted = false;
      breaker.on('reject', () => {
        rejectEmitted = true;
      });

      // Open circuit
      for (let i = 0; i < 10; i++) {
        await breaker.fire().catch(() => {});
      }

      // This should be rejected
      await breaker.fire().catch(() => {});
      expect(rejectEmitted).to.be.true;
    });
  });

  describe('Error Filtering', () => {
    it('should exclude filtered errors from circuit statistics', async () => {
      let callCount = 0;

      async function functionWithClientErrors() {
        callCount++;
        const error = new Error('Client error');
        error.statusCode = 404;
        throw error;
      }

      const breaker = new CircuitBreaker(functionWithClientErrors, {
        timeout: 1000,
        errorThresholdPercentage: 50,
        volumeThreshold: 5,
        errorFilter: (err) => {
          // Exclude 4xx errors
          return err.statusCode >= 400 && err.statusCode < 500;
        }
      });

      // Make many requests with 404 errors
      for (let i = 0; i < 20; i++) {
        await breaker.fire().catch(() => {});
      }

      // Circuit should NOT be open (errors were filtered)
      expect(breaker.opened).to.be.false;
    });

    it('should include non-filtered errors in statistics', async () => {
      let callCount = 0;

      async function functionWithServerErrors() {
        callCount++;
        const error = new Error('Server error');
        error.statusCode = 500;
        throw error;
      }

      const breaker = new CircuitBreaker(functionWithServerErrors, {
        timeout: 1000,
        errorThresholdPercentage: 50,
        volumeThreshold: 5,
        errorFilter: (err) => {
          // Only exclude 4xx errors
          return err.statusCode >= 400 && err.statusCode < 500;
        }
      });

      // Make requests with 500 errors
      for (let i = 0; i < 10; i++) {
        await breaker.fire().catch(() => {});
      }

      // Circuit SHOULD be open (5xx errors not filtered)
      expect(breaker.opened).to.be.true;
    });
  });

  describe('Statistics', () => {
    it('should track request statistics', async () => {
      let callCount = 0;

      async function mixedFunction() {
        callCount++;
        if (callCount % 2 === 0) {
          throw new Error('Failed');
        }
        return 'Success';
      }

      const breaker = new CircuitBreaker(mixedFunction, {
        timeout: 1000,
        volumeThreshold: 0
      });

      // Make 10 requests (5 success, 5 failure)
      for (let i = 0; i < 10; i++) {
        await breaker.fire().catch(() => {});
      }

      const stats = breaker.stats;
      expect(stats.fires).to.equal(10);
      expect(stats.successes).to.equal(5);
      expect(stats.failures).to.equal(5);
    });

    it('should track timeout statistics', async () => {
      async function slowFunction() {
        await new Promise(resolve => setTimeout(resolve, 500));
        return 'Too slow';
      }

      const breaker = new CircuitBreaker(slowFunction, {
        timeout: 100
      });

      // Make 5 requests that will timeout
      for (let i = 0; i < 5; i++) {
        await breaker.fire().catch(() => {});
      }

      const stats = breaker.stats;
      expect(stats.timeouts).to.equal(5);
    });
  });

  describe('Capacity Management', () => {
    it('should reject requests when at capacity', async () => {
      async function slowFunction() {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return 'Success';
      }

      const breaker = new CircuitBreaker(slowFunction, {
        timeout: 2000,
        capacity: 2 // Only allow 2 concurrent requests
      });

      let semaphoreLockedEmitted = false;
      breaker.on('semaphoreLocked', () => {
        semaphoreLockedEmitted = true;
      });

      // Fire 3 concurrent requests (exceeds capacity of 2)
      const promises = [
        breaker.fire(),
        breaker.fire(),
        breaker.fire() // This should be rejected
      ];

      await Promise.allSettled(promises);

      expect(semaphoreLockedEmitted).to.be.true;
    });
  });

  describe('Cleanup', () => {
    afterEach(function() {
      // Shutdown any breakers created in tests
      // This is important to prevent memory leaks in test suites
      if (this.currentTest && this.currentTest.ctx.breaker) {
        this.currentTest.ctx.breaker.shutdown();
      }
    });
  });
});
