# 🔧 DAO Technical Documentation

This document explains the technical workflow, proposal types, and how the DAO executes actions.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                    YOU (User)                   │
│                       ↓                         │
│              MetaMask (Wallet)                  │
│                       ↓                         │
│              Frontend (Website)                 │
│                       ↓                         │
│           Smart Contracts (Rules)               │
│                       ↓                         │
│              Blockchain (Storage)               │
└─────────────────────────────────────────────────┘
```

| Layer | Purpose |
|-------|---------|
| **Blockchain** | Decentralized database - stores all data |
| **Smart Contracts** | Self-executing rules that run automatically |
| **Frontend** | User interface to interact with contracts |
| **MetaMask** | Your wallet/identity for signing transactions |

---

## 👥 The Three Roles

| Role | Who | Powers |
|------|-----|--------|
| **Council** | Trusted members | Create proposals, vote, veto |
| **Technical Committee** | Experts | Fast-track urgent proposals |
| **Public** | Token holders | Vote with tokens on referendums |

---

## 📊 Workflow Diagrams

### Council Proposal Flow
```
Council Member → Create Proposal → Other Members Vote → Pass/Fail
                                         ↓
                                   If threshold met
                                         ↓
                                   Auto-Execute
```

### Fast-Track Flow
```
Council creates proposal → TC Fast-Tracks → Threshold halved + Faster voting
```

### Veto Flow
```
Any Council Member → Veto → Proposal cancelled immediately
```

### Token Referendum Flow
```
Anyone → Create Referendum → Vote with tokens → Pass/Fail → Claim tokens back
```

---

## 📋 Proposal Types Supported

### What the Smart Contract Can Execute

A proposal contains 3 fields:

| Field | Description | Example |
|-------|-------------|---------|
| `target` | Contract/address to call | `0x5FbD...` (Roles contract) |
| `value` | ETH to send | `0` or `1000000000000000000` (1 ETH) |
| `data` | Encoded function call | `0x2f2ff15d...` (grantRole) |

This means the DAO can execute **any action** a normal Ethereum account can!

---

### 🔓 Role Management Proposals

| Action | Target | Function |
|--------|--------|----------|
| Add Council Member | Roles.sol | `grantRole(COUNCIL_ROLE, address)` |
| Remove Council Member | Roles.sol | `revokeRole(COUNCIL_ROLE, address)` |
| Add Technical Committee | Roles.sol | `grantRole(TC_ROLE, address)` |
| Remove Technical Committee | Roles.sol | `revokeRole(TC_ROLE, address)` |

**Example Code:**
```javascript
// Propose to add Alice to Council
const councilRole = await roles.COUNCIL_ROLE();
const calldata = roles.interface.encodeFunctionData("grantRole", [councilRole, aliceAddress]);
await dao.proposeCouncil(roles.address, 0, calldata, 2, 100);
```

---

### 💰 Treasury Proposals

| Action | Target | Function/Value |
|--------|--------|----------------|
| Send ETH | Any address | Just set `value` |
| Send ERC20 | Token contract | `transfer(to, amount)` |
| Approve spending | Token contract | `approve(spender, amount)` |

**Example: Send 1 ETH to Bob:**
```javascript
await dao.proposeCouncil(
    bobAddress,               // target = Bob's wallet
    ethers.parseEther("1"),  // value = 1 ETH
    "0x",                    // data = empty (just send ETH)
    2,                       // threshold = 2 votes
    100                      // duration = 100 blocks
);
```

---

### ⚙️ Contract Upgrade Proposals

| Action | Target | Function |
|--------|--------|----------|
| Change owner | Any contract | `transferOwnership(newOwner)` |
| Change settings | DAO contract | Custom setter functions |
| Pause contract | Any pausable | `pause()` |

---

### 🌐 External Action Proposals

| Action | Target | Description |
|--------|--------|-------------|
| DeFi swap | Uniswap/DEX | `swapExact...()` |
| Provide liquidity | LP contract | `addLiquidity(...)` |
| NFT mint | NFT contract | `mint(to, tokenId)` |

---

## 🔄 How Execution Works

1. **Proposal Created** → Stored on-chain with `ACTIVE` status
2. **Voting Period** → Members vote Aye/Nay
3. **Threshold Check** → If `ayeCount >= threshold`:
4. **Auto-Execute** → DAO calls `target.call{value: value}(data)`
5. **Result** → Action performed, status = `EXECUTED`

**Internal execution code:**
```solidity
function _execute(uint256 id) internal {
    Proposal storage p = proposals[id];
    p.status = ProposalStatus.EXECUTED;
    
    (bool success, bytes memory result) = p.target.call{value: p.value}(p.data);
    
    emit Executed(id, success, result);
}
```

---

## 📝 Currently Implemented in Frontend

| Feature | Status |
|---------|--------|
| Add Council Member | ✅ Available |
| Remove Council Member | ⚠️ Admin panel only |
| Add/Remove TC | ⚠️ Admin panel only |
| Send ETH | ❌ Not in UI |
| Token transfer | ❌ Not in UI |
| Custom calldata | ❌ Not in UI |

The smart contracts support ALL actions - the UI just needs buttons for them!

---

## 🎯 Summary

> **The DAO can do ANYTHING a normal Ethereum account can do.**
> 
> The only limit is what proposals the members approve!

**Formula:**
```
target + value + data = Any blockchain action
```

---

## 📚 Further Reading

- [OpenZeppelin AccessControl](https://docs.openzeppelin.com/contracts/4.x/access-control)
- [Solidity ABI Encoding](https://docs.soliditylang.org/en/latest/abi-spec.html)
- [Hardhat Documentation](https://hardhat.org/docs)
