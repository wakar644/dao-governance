#!/bin/bash
# Production start script for DAO

set -e

echo "🏛️ DAO Production Starter"
echo "=========================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose is not installed. Please install docker-compose first."
    exit 1
fi

# Parse arguments
PUBLIC_MODE=false
while [[ $# -gt 0 ]]; do
    case $1 in
        --public)
            PUBLIC_MODE=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Build and start
echo "📦 Building Docker images..."
docker-compose build

echo "🚀 Starting services..."
if [ "$PUBLIC_MODE" = true ]; then
    echo "🌐 Starting with ngrok (public access)..."
    docker-compose --profile public up -d
    echo ""
    echo "✅ Services started!"
    echo ""
    echo "📊 View ngrok dashboard: http://localhost:4040"
    echo "   (Find your public URL there)"
else
    docker-compose up -d blockchain
    echo "⏳ Waiting for blockchain to start..."
    sleep 10
    docker-compose up deployer
    docker-compose up -d frontend
    echo ""
    echo "✅ Services started!"
fi

echo ""
echo "🔗 Local URLs:"
echo "   Frontend: http://localhost:3000"
echo "   Blockchain: http://localhost:8545"
echo ""
echo "📋 Commands:"
echo "   View logs:    docker-compose logs -f"
echo "   Stop:         docker-compose down"
echo "   Restart:      docker-compose restart"
