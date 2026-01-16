# 🏛️ DAO Governance Project

A Substrate-style Decentralized Autonomous Organization (DAO) on Ethereum, featuring:
- **Council voting** (1 member = 1 vote)
- **Technical Committee fast-track**
- **Token-weighted public referendums**
- **Web frontend with MetaMask integration**

---

## 📁 Project Structure

```
dao/
├── .github/
│   └── workflows/
│       └── ci.yml           # GitHub Actions CI/CD
├── contracts/               # Solidity smart contracts
│   ├── Roles.sol            # Role management (Council, TC)
│   ├── DAO.sol              # Basic governance
│   ├── DAOv2.sol            # Advanced governance
│   └── GovToken.sol         # ERC20 governance token
├── scripts/                 # Deployment & interaction scripts
│   ├── deploy.js            # Deploy basic DAO
│   ├── deployV2.js          # Deploy full DAOv2
│   ├── interact.js          # Demo basic voting
│   ├── interactV2.js        # Demo all features
│   └── checkBalances.js     # View GOV token balances
├── test/                    # Test files
│   ├── DAO.test.js          # Basic DAO tests
│   └── DAOv2.test.js        # Advanced features tests
├── frontend/                # Web interface
│   ├── index.html           # Main HTML
│   ├── styles.css           # Dark theme styles
│   └── app.js               # MetaMask integration
├── Dockerfile               # Docker build file
├── docker-compose.yml       # Docker orchestration
├── start-production.sh      # One-command production start
├── hardhat.config.js        # Hardhat configuration
├── package.json             # NPM dependencies
├── .env.example             # Environment template
├── .gitignore               # Git ignore rules
└── .dockerignore            # Docker ignore rules
```


---

## 📜 Smart Contracts Explained

### `contracts/Roles.sol`
**Purpose:** Manages membership roles using OpenZeppelin AccessControl.

| Role | Description |
|------|-------------|
| `COUNCIL_ROLE` | Can create/vote on proposals, veto |
| `TECHNICAL_COMMITTEE_ROLE` | Can fast-track proposals |
| `DEFAULT_ADMIN_ROLE` | Can add/remove members |

**Key Functions:**
- `addCouncilMember(address)` - Add address to Council
- `removeCouncilMember(address)` - Remove from Council
- `isCouncilMember(address)` → `bool` - Check membership

---

### `contracts/DAO.sol`
**Purpose:** Basic governance with 1-member-1-vote.

**Workflow:**
1. Council member calls `propose(target, value, data, threshold, duration)`
2. Council members call `vote(id, true/false)`
3. When `ayeCount >= threshold`, proposal auto-executes
4. The DAO calls the target contract with the encoded data

---

### `contracts/DAOv2.sol`
**Purpose:** Advanced governance with all Substrate-like features.

| Feature | Function | Who Can Use |
|---------|----------|-------------|
| Council Proposal | `proposeCouncil()` | Council |
| Council Vote | `voteCouncil()` | Council |
| Fast-Track | `fastTrack(id, newDuration)` | Technical Committee |
| Veto | `veto(id)` | Council |
| Referendum | `proposeReferendum()` | Anyone |
| Token Vote | `voteReferendum(id, approve, tokens)` | Token holders |
| Claim Tokens | `claimTokens(id)` | Voters (after voting ends) |

**Proposal Types:**
- `COUNCIL` (0) - 1 member = 1 vote
- `REFERENDUM` (1) - Token-weighted voting

**Proposal Statuses:**
- `ACTIVE` (0) - Voting in progress
- `EXECUTED` (1) - Successfully executed
- `VETOED` (2) - Cancelled by Council

---

### `contracts/GovToken.sol`
**Purpose:** ERC20 token for referendum voting.

- Symbol: `GOV`
- Decimals: 18
- When voting in referendums, tokens are locked until voting ends
- Call `claimTokens(proposalId)` to get them back

---

## 📂 Scripts Explained

### `scripts/deploy.js`
Deploys basic DAO (Roles + DAO contracts).
```bash
npx hardhat run scripts/deploy.js --network localhost
```

### `scripts/deployV2.js`
Deploys full system (Roles + GovToken + DAOv2).
```bash
npx hardhat run scripts/deployV2.js --network localhost
```

### `scripts/interact.js`
Demo: Creates a proposal and votes to add a new Council member.

### `scripts/interactV2.js`
Demo: Shows all features - fast-track, veto, and token voting.

### `scripts/checkBalances.js`
Displays GOV token balances for all test accounts.

---

## 🧪 Tests Explained

### `test/DAO.test.js`
Tests basic voting flow:
- Deploy contracts
- Add council members
- Create proposal
- Vote and execute

### `test/DAOv2.test.js`
Tests advanced features:
- Fast-track (TC halves threshold)
- Veto (Council cancels proposal)
- Token referendum (vote with GOV tokens)
- Token claiming

**Run all tests:**
```bash
npx hardhat test
```

---

## 🖥️ Frontend Explained

### `frontend/index.html`
Main page structure with:
- Header with wallet connection
- Stats dashboard (role, proposals, GOV balance)
- Admin panel (add/remove members)
- Create proposal form
- Proposals list with action buttons
- Modals for fast-track and token voting

### `frontend/styles.css`
Dark theme with:
- Glass morphism effects
- Gradient buttons
- Progress bars for voting
- Toast notifications
- Responsive design

### `frontend/app.js`
JavaScript handling:
- MetaMask connection & chain switching
- Contract interactions via ethers.js
- Creating proposals
- Voting (council and token)
- Fast-tracking
- Vetoing
- Admin functions

---

## 🚀 Quick Start

```bash
# 1. Start local blockchain
npx hardhat node

# 2. Deploy contracts (new terminal)
npx hardhat run scripts/deployV2.js --network localhost

# 3. Start frontend (new terminal)
cd frontend && npx serve -l 3000

# 4. Open http://localhost:3000 in browser

# 5. Connect MetaMask (Chain ID: 31337)
```

### ⏹️ To Stop Everything:

```bash
# Stop the blockchain (in the terminal running hardhat node)
Ctrl + C

# Stop the frontend (in the terminal running serve)
Ctrl + C

# Or kill by port number:
npx kill-port 8545   # Kill blockchain
npx kill-port 3000   # Kill frontend
```

**Note:** When you stop the blockchain, all data is lost. Re-run deploy scripts after restarting.

---

## 🐳 Docker Production Mode

### Quick Start with Docker
```bash
# Build and run everything
./start-production.sh

# Or with public ngrok access
./start-production.sh --public
```

### Manual Docker Commands
```bash
# Build the image
docker-compose build

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### With Public URL (ngrok)
```bash
# Start with ngrok profile
docker-compose --profile public up -d

# View ngrok dashboard to get public URL
open http://localhost:4040
```

---

## 🔄 CI/CD (GitHub Actions)

The project includes automated CI/CD that runs on every push:

1. **Test** - Runs Hardhat tests
2. **Build** - Builds Docker image
3. **Integration** - Tests full Docker stack

See `.github/workflows/ci.yml` for details.



## 🔑 Test Accounts

| Account | Address | Private Key |
|---------|---------|-------------|
| #0 (Admin) | `0xf39Fd6e51...` | `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` |
| #1 | `0x70997970C5...` | `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d` |
| #2 | `0x3C44CdDdB6...` | `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a` |

⚠️ **Never use these on mainnet!**

---

## 📊 Workflow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     DAO GOVERNANCE FLOW                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐              │
│  │ Council  │───▶│ Propose  │───▶│  Vote    │              │
│  └──────────┘    └──────────┘    └────┬─────┘              │
│                                       │                     │
│                       ┌───────────────┼───────────────┐     │
│                       ▼               ▼               ▼     │
│                  ┌─────────┐    ┌─────────┐    ┌─────────┐  │
│                  │Fast-Track│   │  Veto   │    │ Execute │  │
│                  │  (TC)    │   │(Council)│    │(if pass)│  │
│                  └─────────┘    └─────────┘    └─────────┘  │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                   TOKEN REFERENDUM FLOW                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌───────┐ │
│  │ Anyone   │───▶│ Propose  │───▶│Vote with │───▶│ Claim │ │
│  │          │    │Referendum│    │  Tokens  │    │Tokens │ │
│  └──────────┘    └──────────┘    └──────────┘    └───────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📄 License

MIT
