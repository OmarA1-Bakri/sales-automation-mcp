#!/bin/bash
#
# E2E Test Orchestrator
#
# Runs persona-based E2E tests in parallel Docker containers.
#
# Usage:
#   ./scripts/run-e2e-tests.sh              # Run all 5 personas in parallel
#   ./scripts/run-e2e-tests.sh 1 3          # Run only persona 1 and 3
#   ./scripts/run-e2e-tests.sh --sequential # Run personas one at a time
#   ./scripts/run-e2e-tests.sh --clean      # Clean up test containers first
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Configuration
COMPOSE_FILE="docker-compose.e2e.yml"
RESULTS_DIR="test-results"

# Print header
echo -e "${BOLD}${CYAN}"
echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║               🎭 E2E PERSONA TEST ORCHESTRATOR                       ║"
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Parse arguments
PERSONAS=()
SEQUENTIAL=false
CLEAN=false
AGGREGATE=false

for arg in "$@"; do
    case $arg in
        --sequential)
            SEQUENTIAL=true
            ;;
        --clean)
            CLEAN=true
            ;;
        --aggregate)
            AGGREGATE=true
            ;;
        [1-5])
            PERSONAS+=("persona-$arg")
            ;;
        *)
            echo -e "${RED}Unknown argument: $arg${NC}"
            echo "Usage: $0 [1-5...] [--sequential] [--clean] [--aggregate]"
            exit 1
            ;;
    esac
done

# Default to all personas if none specified
if [ ${#PERSONAS[@]} -eq 0 ]; then
    PERSONAS=("persona-1" "persona-2" "persona-3" "persona-4" "persona-5")
fi

# Clean up if requested
if [ "$CLEAN" = true ]; then
    echo -e "${YELLOW}🧹 Cleaning up existing containers...${NC}"
    docker-compose -f "$COMPOSE_FILE" down -v --remove-orphans 2>/dev/null || true
    rm -rf "$RESULTS_DIR"
fi

# Create results directory
mkdir -p "$RESULTS_DIR"
for i in {1..5}; do
    mkdir -p "$RESULTS_DIR/persona-$i"
done

# Start infrastructure
echo -e "${BLUE}🚀 Starting infrastructure (postgres, redis, api, frontend)...${NC}"
docker-compose -f "$COMPOSE_FILE" up -d postgres redis
echo -e "${YELLOW}   Waiting for database...${NC}"
sleep 5

docker-compose -f "$COMPOSE_FILE" up -d api
echo -e "${YELLOW}   Waiting for API...${NC}"
sleep 10

docker-compose -f "$COMPOSE_FILE" up -d frontend
echo -e "${YELLOW}   Waiting for frontend...${NC}"
sleep 10

# Verify infrastructure
echo -e "${BLUE}🔍 Verifying infrastructure health...${NC}"

API_HEALTH=$(docker-compose -f "$COMPOSE_FILE" exec -T api curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health 2>/dev/null || echo "000")
if [ "$API_HEALTH" != "200" ]; then
    echo -e "${RED}❌ API health check failed (HTTP $API_HEALTH)${NC}"
    echo -e "${YELLOW}   Checking API logs:${NC}"
    docker-compose -f "$COMPOSE_FILE" logs --tail=20 api
    exit 1
fi
echo -e "${GREEN}   ✓ API is healthy${NC}"

FRONTEND_HEALTH=$(docker-compose -f "$COMPOSE_FILE" exec -T frontend curl -s -o /dev/null -w "%{http_code}" http://localhost:5173 2>/dev/null || echo "000")
if [ "$FRONTEND_HEALTH" != "200" ]; then
    echo -e "${RED}❌ Frontend health check failed (HTTP $FRONTEND_HEALTH)${NC}"
    echo -e "${YELLOW}   Checking frontend logs:${NC}"
    docker-compose -f "$COMPOSE_FILE" logs --tail=20 frontend
    exit 1
fi
echo -e "${GREEN}   ✓ Frontend is healthy${NC}"

# Run persona tests
echo ""
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║                   RUNNING PERSONA TESTS                              ║${NC}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

START_TIME=$(date +%s)

if [ "$SEQUENTIAL" = true ]; then
    echo -e "${YELLOW}Running personas sequentially...${NC}"
    for persona in "${PERSONAS[@]}"; do
        echo -e "\n${BLUE}▶ Starting $persona...${NC}"
        docker-compose -f "$COMPOSE_FILE" up --build "$persona"
        EXIT_CODE=$?
        if [ $EXIT_CODE -ne 0 ]; then
            echo -e "${RED}❌ $persona failed with exit code $EXIT_CODE${NC}"
        else
            echo -e "${GREEN}✓ $persona completed${NC}"
        fi
    done
else
    echo -e "${YELLOW}Running personas in parallel...${NC}"
    echo -e "${CYAN}   Personas: ${PERSONAS[*]}${NC}"
    echo ""

    # Build all persona containers first
    docker-compose -f "$COMPOSE_FILE" build "${PERSONAS[@]}"

    # Run all personas in parallel
    docker-compose -f "$COMPOSE_FILE" up --no-build "${PERSONAS[@]}"
fi

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║                      TEST RESULTS SUMMARY                            ║${NC}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Aggregate results
echo -e "${BLUE}📊 Aggregating results...${NC}"

# Check each persona's results
TOTAL_PASSED=0
TOTAL_FAILED=0
PERSONA_RESULTS=""

for i in {1..5}; do
    RESULTS_FILE="$RESULTS_DIR/persona-$i/results.json"
    if [ -f "$RESULTS_FILE" ]; then
        PASSED=$(jq -r '.passedFlows // 0' "$RESULTS_FILE" 2>/dev/null || echo "0")
        FAILED=$(jq -r '.failedFlows // 0' "$RESULTS_FILE" 2>/dev/null || echo "0")
        NAME=$(jq -r '.persona // "Unknown"' "$RESULTS_FILE" 2>/dev/null || echo "Persona $i")

        TOTAL_PASSED=$((TOTAL_PASSED + PASSED))
        TOTAL_FAILED=$((TOTAL_FAILED + FAILED))

        if [ "$FAILED" -eq 0 ]; then
            STATUS="${GREEN}✓ PASSED${NC}"
        else
            STATUS="${RED}✗ FAILED${NC}"
        fi

        PERSONA_RESULTS+="   Persona $i ($NAME): $STATUS - $PASSED passed, $FAILED failed\n"
    else
        PERSONA_RESULTS+="   Persona $i: ${YELLOW}⚠ No results found${NC}\n"
    fi
done

echo -e "$PERSONA_RESULTS"
echo ""
echo -e "${BOLD}Total Duration: ${DURATION}s${NC}"
echo -e "${BOLD}Total Flows Passed: ${GREEN}$TOTAL_PASSED${NC}"
echo -e "${BOLD}Total Flows Failed: ${RED}$TOTAL_FAILED${NC}"
echo ""

# Final status
if [ "$TOTAL_FAILED" -eq 0 ]; then
    echo -e "${GREEN}${BOLD}═══════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}${BOLD}                    🎉 ALL E2E TESTS PASSED!                           ${NC}"
    echo -e "${GREEN}${BOLD}═══════════════════════════════════════════════════════════════════════${NC}"
    EXIT=0
else
    echo -e "${RED}${BOLD}═══════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${RED}${BOLD}                  ⚠️  SOME E2E TESTS FAILED                              ${NC}"
    echo -e "${RED}${BOLD}═══════════════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${YELLOW}Check individual results in: $RESULTS_DIR/persona-*/results.json${NC}"
    EXIT=1
fi

# Cleanup option
echo ""
echo -e "${BLUE}💡 To view logs: docker-compose -f $COMPOSE_FILE logs persona-1${NC}"
echo -e "${BLUE}💡 To clean up:  docker-compose -f $COMPOSE_FILE down -v${NC}"
echo ""

exit $EXIT
