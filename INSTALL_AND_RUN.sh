#!/bin/bash

# Test Coverage Installation and Execution Script
# This script installs dependencies and runs tests with coverage

echo "=================================="
echo "🧪 Test Coverage Setup & Execution"
echo "=================================="
echo ""

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm is not installed"
    exit 1
fi

echo "📦 Step 1/3: Installing test dependencies..."
echo ""
npm install

if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to install dependencies"
    exit 1
fi

echo ""
echo "✅ Dependencies installed successfully!"
echo ""

echo "🧪 Step 2/3: Running tests with coverage..."
echo ""
npm run test:coverage

if [ $? -ne 0 ]; then
    echo "❌ Error: Tests failed"
    exit 1
fi

echo ""
echo "✅ Tests completed successfully!"
echo ""

echo "📊 Step 3/3: Opening coverage report..."
echo ""

# Detect OS and open coverage report
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    open coverage/index.html
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    xdg-open coverage/index.html 2>/dev/null || echo "Please manually open coverage/index.html"
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    # Windows
    start coverage/index.html
else
    echo "Please manually open coverage/index.html in your browser"
fi

echo ""
echo "=================================="
echo "✨ All Done!"
echo "=================================="
echo ""
echo "📍 Coverage report: coverage/index.html"
echo "📍 LCOV report: coverage/lcov.info (for SonarQube)"
echo ""
echo "Next steps:"
echo "  1. Review the coverage report in your browser"
echo "  2. Configure GitHub secrets for SonarQube"
echo "  3. Push to GitHub to trigger CI/CD pipeline"
echo ""
echo "For more information, see:"
echo "  - TESTING_QUICK_START.md"
echo "  - TEST_COVERAGE_GUIDE.md"
echo ""

