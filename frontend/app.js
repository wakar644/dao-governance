// Contract addresses - Sepolia Testnet
const CONTRACTS = {
    roles: "0xD0Af3468EAfc249EE05A3205d784Efe9ab1Ee7eF",
    dao: "0xb57fC8ac07528B74c69710C928D95Fb2Ae1adE4C",
    daoV2: "0xb57fC8ac07528B74c69710C928D95Fb2Ae1adE4C",
    govToken: "0x2ec550b17CB31989C2D93459e6fC4F47591881f4"
};


// ABIs
const ROLES_ABI = [
    "function isCouncilMember(address account) view returns (bool)",
    "function isTechnicalCommitteeMember(address account) view returns (bool)",
    "function COUNCIL_ROLE() view returns (bytes32)",
    "function TECHNICAL_COMMITTEE_ROLE() view returns (bytes32)",
    "function addCouncilMember(address account)",
    "function removeCouncilMember(address account)",
    "function addTechnicalCommitteeMember(address account)",
    "function removeTechnicalCommitteeMember(address account)",
    "event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)"
];

const DAO_ABI = [
    "function proposalCount() view returns (uint256)",
    "function proposals(uint256) view returns (uint256 id, address proposer, address target, uint256 value, bytes data, uint256 threshold, uint256 ayeCount, uint256 nayCount, bool executed, uint256 endBlock)",
    "function hasVoted(uint256, address) view returns (bool)",
    "function propose(address target, uint256 value, bytes data, uint256 threshold, uint256 durationBlocks) returns (uint256)",
    "function vote(uint256 id, bool approve)",
    "function execute(uint256 id)",
    "event Proposed(uint256 indexed id, address indexed proposer, uint256 threshold, uint256 endBlock)",
    "event Voted(uint256 indexed id, address indexed voter, bool support)",
    "event Executed(uint256 indexed id, bool success, bytes result)"
];

const DAOV2_ABI = [
    "function proposalCount() view returns (uint256)",
    "function proposals(uint256) view returns (uint256 id, uint8 proposalType, uint8 status, address proposer, address target, uint256 value, bytes data, uint256 threshold, uint256 ayeCount, uint256 nayCount, uint256 ayeTokens, uint256 nayTokens, uint256 endBlock, bool fastTracked)",
    "function hasVoted(uint256, address) view returns (bool)",
    "function proposeCouncil(address target, uint256 value, bytes data, uint256 threshold, uint256 durationBlocks) returns (uint256)",
    "function voteCouncil(uint256 id, bool approve)",
    "function proposeReferendum(address target, uint256 value, bytes data, uint256 tokenThreshold, uint256 durationBlocks) returns (uint256)",
    "function voteReferendum(uint256 id, bool approve, uint256 tokenAmount)",
    "function fastTrack(uint256 id, uint256 newDurationBlocks)",
    "function veto(uint256 id)",
    "function execute(uint256 id)",
    "event Proposed(uint256 indexed id, uint8 proposalType, address indexed proposer, uint256 threshold, uint256 endBlock)",
    "event Voted(uint256 indexed id, address indexed voter, bool support, uint256 weight)",
    "event FastTracked(uint256 indexed id, uint256 newEndBlock)",
    "event Vetoed(uint256 indexed id, address indexed vetoer)",
    "event Executed(uint256 indexed id, bool success, bytes result)"
];

const GOV_TOKEN_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)"
];

// State
let provider, signer, userAddress;
let rolesContract, daoContract, daoV2Contract, govTokenContract;
let useV2 = false;
let isCouncil = false;
let isTC = false;
let currentFastTrackId = null;
let currentTokenVoteId = null;
let allAccounts = [];

// DOM Elements
const connectBtn = document.getElementById('connect-btn');
const connectBtnMain = document.getElementById('connect-btn-main');
const connectText = document.getElementById('connect-text');
const networkBadge = document.getElementById('network-badge');
const networkName = document.getElementById('network-name');
const connectPrompt = document.getElementById('connect-prompt');
const dashboard = document.getElementById('dashboard');
const userRoleEl = document.getElementById('user-role');
const proposalCountEl = document.getElementById('proposal-count');
const tokenBalanceEl = document.getElementById('token-balance');
const currentBlockEl = document.getElementById('current-block');
const proposalsListEl = document.getElementById('proposals-list');
const createProposalBtn = document.getElementById('create-proposal-btn');
const refreshBtn = document.getElementById('refresh-btn');
const toastContainer = document.getElementById('toast-container');
const accountSelector = document.getElementById('account-selector');

// Initialize
async function init() {
    connectBtn.addEventListener('click', connectWallet);
    connectBtnMain.addEventListener('click', connectWallet);
    createProposalBtn.addEventListener('click', createProposal);
    refreshBtn.addEventListener('click', loadProposals);

    // Admin buttons
    document.getElementById('add-council-btn').addEventListener('click', () => addCouncilMember());
    document.getElementById('remove-council-btn').addEventListener('click', () => removeCouncilMember());
    document.getElementById('add-tc-btn').addEventListener('click', () => addTCMember());
    document.getElementById('remove-tc-btn').addEventListener('click', () => removeTCMember());

    if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
            await connectWallet();
        }
    }
}

// Connect Wallet
async function connectWallet() {
    if (!window.ethereum) {
        showToast('Please install MetaMask!', 'error');
        return;
    }

    try {
        // Sepolia Testnet Chain ID
        const SEPOLIA_CHAIN_ID = '0xaa36a7'; // 11155111 in hex

        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: SEPOLIA_CHAIN_ID }],
            });
        } catch (switchError) {
            if (switchError.code === 4902) {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: SEPOLIA_CHAIN_ID,
                        chainName: 'Sepolia Testnet',
                        rpcUrls: ['https://ethereum-sepolia-rpc.publicnode.com'],
                        nativeCurrency: { name: 'SepoliaETH', symbol: 'ETH', decimals: 18 },
                        blockExplorerUrls: ['https://sepolia.etherscan.io']
                    }],
                });
            }
        }

        provider = new ethers.BrowserProvider(window.ethereum);

        // Force MetaMask to show account selection dialog
        await window.ethereum.request({
            method: 'wallet_requestPermissions',
            params: [{ eth_accounts: {} }]
        });

        // Now get all connected accounts
        allAccounts = await window.ethereum.request({ method: 'eth_accounts' });
        console.log('Connected accounts:', allAccounts);

        // Populate account selector
        accountSelector.innerHTML = '<option value="">Switch Account</option>';
        for (let i = 0; i < allAccounts.length; i++) {
            const addr = allAccounts[i];
            const option = document.createElement('option');
            option.value = addr;
            option.textContent = `#${i}: ${addr.slice(0, 8)}...${addr.slice(-6)}`;
            accountSelector.appendChild(option);
        }
        accountSelector.classList.remove('hidden');


        // Set current account (first one or selected one)
        signer = await provider.getSigner();
        userAddress = await signer.getAddress();
        accountSelector.value = userAddress;

        const network = await provider.getNetwork();
        const chainId = Number(network.chainId);

        if (chainId === 31337) {
            networkName.textContent = 'Hardhat Local (31337)';
        } else {
            networkName.textContent = `Chain ${chainId}`;
            showToast(`Warning: Expected Chain 31337, got ${chainId}`, 'error');
        }
        networkBadge.classList.remove('hidden');
        connectText.textContent = `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;

        // Initialize contracts
        rolesContract = new ethers.Contract(CONTRACTS.roles, ROLES_ABI, signer);
        daoContract = new ethers.Contract(CONTRACTS.dao, DAO_ABI, signer);

        try {
            daoV2Contract = new ethers.Contract(CONTRACTS.daoV2, DAOV2_ABI, signer);
            govTokenContract = new ethers.Contract(CONTRACTS.govToken, GOV_TOKEN_ABI, signer);
            await daoV2Contract.proposalCount();
            useV2 = true;
        } catch {
            useV2 = false;
        }

        connectPrompt.classList.add('hidden');
        dashboard.classList.remove('hidden');

        await loadUserInfo();
        await loadProposals();
        await updateBlockNumber();

        // Handle account change from dropdown
        accountSelector.addEventListener('change', switchAccount);

        window.ethereum.on('accountsChanged', () => location.reload());
        window.ethereum.on('chainChanged', () => location.reload());

        showToast('Wallet connected!', 'success');
    } catch (error) {
        console.error(error);
        showToast('Failed to connect wallet', 'error');
    }

}

// Switch Account
async function switchAccount() {
    const selectedAddress = accountSelector.value;
    if (!selectedAddress) return;

    // Check if this address is in our list
    if (!allAccounts.includes(selectedAddress.toLowerCase()) &&
        !allAccounts.includes(selectedAddress)) {
        showToast('Account not available', 'error');
        return;
    }

    try {
        showToast('Switching account...', 'success');

        // Update the current address
        userAddress = selectedAddress;

        // Get a new signer for this address
        // Note: On Hardhat, any connected account can sign
        signer = await provider.getSigner(selectedAddress);

        // Reinitialize all contracts with new signer
        rolesContract = new ethers.Contract(CONTRACTS.roles, ROLES_ABI, signer);
        daoContract = new ethers.Contract(CONTRACTS.dao, DAO_ABI, signer);
        if (useV2) {
            daoV2Contract = new ethers.Contract(CONTRACTS.daoV2, DAOV2_ABI, signer);
            govTokenContract = new ethers.Contract(CONTRACTS.govToken, GOV_TOKEN_ABI, signer);
        }

        // Update UI
        connectText.textContent = `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;

        // Reload user info and proposals
        await loadUserInfo();
        await loadProposals();
        await updateBlockNumber();

        showToast(`Switched to ${userAddress.slice(0, 8)}...`, 'success');
    } catch (error) {
        console.error('Switch account error:', error);
        showToast('Failed to switch account: ' + error.message, 'error');
    }
}


// Load User Info

async function loadUserInfo() {
    try {
        isCouncil = await rolesContract.isCouncilMember(userAddress);
        isTC = await rolesContract.isTechnicalCommitteeMember(userAddress);

        let role = 'Public';
        if (isCouncil && isTC) role = 'Council + TC';
        else if (isCouncil) role = 'Council';
        else if (isTC) role = 'Technical Committee';

        userRoleEl.textContent = role;

        if (useV2 && govTokenContract) {
            try {
                const balance = await govTokenContract.balanceOf(userAddress);
                tokenBalanceEl.textContent = ethers.formatEther(balance);
            } catch {
                tokenBalanceEl.textContent = '0';
            }
        } else {
            tokenBalanceEl.textContent = 'N/A';
        }
    } catch (error) {
        console.error('Error loading user info:', error);
    }
}

async function updateBlockNumber() {
    try {
        const block = await provider.getBlockNumber();
        currentBlockEl.textContent = block;
    } catch { }
}

// Load Proposals
async function loadProposals() {
    try {
        proposalsListEl.innerHTML = '<div class="loading">Loading proposals...</div>';
        await updateBlockNumber();

        const contract = useV2 ? daoV2Contract : daoContract;
        const count = await contract.proposalCount();
        proposalCountEl.textContent = count.toString();

        if (count === 0n) {
            proposalsListEl.innerHTML = '<div class="loading">No proposals yet. Create one!</div>';
            return;
        }

        const currentBlock = await provider.getBlockNumber();
        let html = '';

        for (let i = Number(count) - 1; i >= 0 && i >= Number(count) - 10; i--) {
            const proposal = await contract.proposals(i);
            const hasVoted = await contract.hasVoted(i, userAddress);

            let status, statusClass, proposalType, isFastTracked = false;

            if (useV2) {
                const statusNum = Number(proposal.status);
                const typeNum = Number(proposal.proposalType);
                proposalType = typeNum === 0 ? 'Council' : 'Referendum';
                isFastTracked = proposal.fastTracked;

                if (statusNum === 0) { status = 'Active'; statusClass = 'status-active'; }
                else if (statusNum === 1) { status = 'Executed'; statusClass = 'status-executed'; }
                else if (statusNum === 2) { status = 'Vetoed'; statusClass = 'status-vetoed'; }
                else { status = 'Expired'; statusClass = 'status-vetoed'; }
            } else {
                proposalType = 'Council';
                status = proposal.executed ? 'Executed' : 'Active';
                statusClass = proposal.executed ? 'status-executed' : 'status-active';
            }

            const ayes = Number(proposal.ayeCount);
            const nays = Number(proposal.nayCount);
            const threshold = Number(proposal.threshold);
            const endBlock = Number(proposal.endBlock);
            const progress = threshold > 0 ? Math.min((ayes / threshold) * 100, 100) : 0;
            const blocksLeft = endBlock > currentBlock ? endBlock - currentBlock : 0;

            html += `
                <div class="proposal-card" data-id="${i}">
                    <div class="proposal-header">
                        <div>
                            <span class="proposal-id">Proposal #${i}</span>
                            <span class="proposal-type">${proposalType}</span>
                        </div>
                        <div>
                            <span class="proposal-status ${statusClass}">${status}</span>
                            ${isFastTracked ? '<span class="badge-fasttracked">⚡ Fast-Tracked</span>' : ''}
                        </div>
                    </div>
                    <div class="proposal-title">Add Member to Council</div>
                    <div class="proposal-meta">
                        <span>Threshold: ${threshold}</span>
                        <span>Proposer: ${proposal.proposer.slice(0, 8)}...</span>
                        <span>Blocks Left: ${blocksLeft}</span>
                    </div>
                    <div class="vote-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progress}%"></div>
                        </div>
                        <div class="vote-counts">
                            <span class="vote-aye">✓ ${ayes} Aye</span>
                            <span class="vote-nay">✗ ${nays} Nay</span>
                        </div>
                    </div>
                    ${status === 'Active' ? `
                        <div class="proposal-actions">
                            ${proposalType === 'Referendum' ? `
                                <button class="btn btn-success btn-small" onclick="openTokenVoteModal(${i})">Vote with Tokens</button>
                            ` : `
                                <button class="btn btn-success btn-small" onclick="vote(${i}, true)" ${hasVoted ? 'disabled' : ''}>
                                    ${hasVoted ? 'Voted' : 'Vote Aye'}
                                </button>
                                <button class="btn btn-error btn-small" onclick="vote(${i}, false)" ${hasVoted ? 'disabled' : ''}>
                                    ${hasVoted ? 'Voted' : 'Vote Nay'}
                                </button>
                            `}
                            ${useV2 && isTC && !isFastTracked ? `<button class="btn btn-warning btn-small" onclick="openFastTrackModal(${i})">⚡ Fast-Track</button>` : ''}
                            ${useV2 && isCouncil ? `<button class="btn btn-secondary btn-small" onclick="vetoProposal(${i})">Veto</button>` : ''}
                            <button class="btn btn-secondary btn-small" onclick="executeProposal(${i})">Execute</button>
                        </div>
                    ` : ''}
                </div>
            `;
        }

        proposalsListEl.innerHTML = html || '<div class="loading">No proposals yet.</div>';
    } catch (error) {
        console.error('Error loading proposals:', error);
        proposalsListEl.innerHTML = '<div class="loading">Error loading proposals. Are contracts deployed?</div>';
    }
}

// Toggle proposal type
function toggleProposalType() {
    const type = document.getElementById('proposal-type').value;
    const tokenGroup = document.getElementById('token-amount-group');
    const thresholdLabel = document.getElementById('threshold-label');

    if (type === 'referendum') {
        tokenGroup.classList.remove('hidden');
        thresholdLabel.textContent = 'Threshold (GOV tokens)';
    } else {
        tokenGroup.classList.add('hidden');
        thresholdLabel.textContent = 'Threshold (votes)';
    }
}

// Toggle action type - show/hide appropriate fields
function toggleActionType() {
    const action = document.getElementById('action-type').value;
    const targetGroup = document.getElementById('target-address-group');
    const ethGroup = document.getElementById('eth-amount-group');
    const customGroup = document.getElementById('custom-calldata-group');
    const targetLabel = document.getElementById('target-address-label');

    // Hide all
    targetGroup.classList.add('hidden');
    ethGroup.classList.add('hidden');
    customGroup.classList.add('hidden');

    switch (action) {
        case 'add-council':
            targetGroup.classList.remove('hidden');
            targetLabel.textContent = 'Address to Add';
            break;
        case 'remove-council':
            targetGroup.classList.remove('hidden');
            targetLabel.textContent = 'Address to Remove';
            break;
        case 'add-tc':
            targetGroup.classList.remove('hidden');
            targetLabel.textContent = 'Address to Add to TC';
            break;
        case 'remove-tc':
            targetGroup.classList.remove('hidden');
            targetLabel.textContent = 'Address to Remove from TC';
            break;
        case 'send-eth':
            targetGroup.classList.remove('hidden');
            ethGroup.classList.remove('hidden');
            targetLabel.textContent = 'Recipient Address';
            break;
        case 'custom':
            customGroup.classList.remove('hidden');
            break;
    }
}

// Create Proposal
async function createProposal() {
    const votingType = document.getElementById('proposal-type').value;
    const actionType = document.getElementById('action-type').value;
    const threshold = document.getElementById('threshold').value;
    const duration = document.getElementById('duration').value;

    let target, value, calldata;

    try {
        createProposalBtn.disabled = true;
        createProposalBtn.textContent = 'Creating...';

        // Build target, value, and calldata based on action type
        switch (actionType) {
            case 'add-council': {
                const addr = document.getElementById('target-address').value;
                if (!ethers.isAddress(addr)) { showToast('Invalid address', 'error'); return; }
                const councilRole = await rolesContract.COUNCIL_ROLE();
                const iface = new ethers.Interface(["function grantRole(bytes32 role, address account)"]);
                target = CONTRACTS.roles;
                value = 0n;
                calldata = iface.encodeFunctionData("grantRole", [councilRole, addr]);
                break;
            }
            case 'remove-council': {
                const addr = document.getElementById('target-address').value;
                if (!ethers.isAddress(addr)) { showToast('Invalid address', 'error'); return; }
                const councilRole = await rolesContract.COUNCIL_ROLE();
                const iface = new ethers.Interface(["function revokeRole(bytes32 role, address account)"]);
                target = CONTRACTS.roles;
                value = 0n;
                calldata = iface.encodeFunctionData("revokeRole", [councilRole, addr]);
                break;
            }
            case 'add-tc': {
                const addr = document.getElementById('target-address').value;
                if (!ethers.isAddress(addr)) { showToast('Invalid address', 'error'); return; }
                const tcRole = await rolesContract.TECHNICAL_COMMITTEE_ROLE();
                const iface = new ethers.Interface(["function grantRole(bytes32 role, address account)"]);
                target = CONTRACTS.roles;
                value = 0n;
                calldata = iface.encodeFunctionData("grantRole", [tcRole, addr]);
                break;
            }
            case 'remove-tc': {
                const addr = document.getElementById('target-address').value;
                if (!ethers.isAddress(addr)) { showToast('Invalid address', 'error'); return; }
                const tcRole = await rolesContract.TECHNICAL_COMMITTEE_ROLE();
                const iface = new ethers.Interface(["function revokeRole(bytes32 role, address account)"]);
                target = CONTRACTS.roles;
                value = 0n;
                calldata = iface.encodeFunctionData("revokeRole", [tcRole, addr]);
                break;
            }
            case 'send-eth': {
                const addr = document.getElementById('target-address').value;
                const ethAmount = document.getElementById('eth-amount').value;
                if (!ethers.isAddress(addr)) { showToast('Invalid address', 'error'); return; }
                if (!ethAmount || ethAmount <= 0) { showToast('Invalid ETH amount', 'error'); return; }
                target = addr;
                value = ethers.parseEther(ethAmount);
                calldata = "0x";
                break;
            }
            case 'custom': {
                const contractAddr = document.getElementById('custom-contract').value;
                const customCalldata = document.getElementById('custom-calldata').value;
                const customValue = document.getElementById('custom-value').value || "0";
                if (!ethers.isAddress(contractAddr)) { showToast('Invalid contract address', 'error'); return; }
                target = contractAddr;
                value = ethers.parseEther(customValue);
                calldata = customCalldata || "0x";
                break;
            }
        }

        // Submit the proposal
        let tx;
        if (useV2 && votingType === 'council') {
            tx = await daoV2Contract.proposeCouncil(target, value, calldata, threshold, duration);
        } else if (useV2 && votingType === 'referendum') {
            tx = await daoV2Contract.proposeReferendum(target, value, calldata, ethers.parseEther(threshold), duration);
        } else {
            tx = await daoContract.propose(target, value, calldata, threshold, duration);
        }

        showToast('Transaction submitted...', 'success');
        await tx.wait();
        showToast('Proposal created!', 'success');
        await loadProposals();
    } catch (error) {
        console.error(error);
        showToast(error.reason || 'Failed to create proposal', 'error');
    } finally {
        createProposalBtn.disabled = false;
        createProposalBtn.textContent = 'Create Proposal';
    }
}


// Vote (Council)
async function vote(id, approve) {
    try {
        showToast('Submitting vote...', 'success');
        let tx = useV2 ? await daoV2Contract.voteCouncil(id, approve) : await daoContract.vote(id, approve);
        await tx.wait();
        showToast(approve ? 'Voted Aye!' : 'Voted Nay!', 'success');
        await loadProposals();
    } catch (error) {
        console.error(error);
        showToast(error.reason || 'Failed to vote', 'error');
    }
}

// Veto
async function vetoProposal(id) {
    try {
        showToast('Submitting veto...', 'success');
        const tx = await daoV2Contract.veto(id);
        await tx.wait();
        showToast('Proposal vetoed!', 'success');
        await loadProposals();
    } catch (error) {
        console.error(error);
        showToast(error.reason || 'Failed to veto', 'error');
    }
}

// Execute
async function executeProposal(id) {
    try {
        showToast('Executing proposal...', 'success');
        const contract = useV2 ? daoV2Contract : daoContract;
        const tx = await contract.execute(id);
        await tx.wait();
        showToast('Proposal executed!', 'success');
        await loadProposals();
    } catch (error) {
        console.error(error);
        showToast(error.reason || 'Failed to execute (threshold not met?)', 'error');
    }
}

// Fast-Track Modal
function openFastTrackModal(id) {
    currentFastTrackId = id;
    document.getElementById('fasttrack-modal').classList.remove('hidden');
}

function closeFastTrackModal() {
    currentFastTrackId = null;
    document.getElementById('fasttrack-modal').classList.add('hidden');
}

async function confirmFastTrack() {
    const duration = document.getElementById('fasttrack-duration').value;
    try {
        showToast('Fast-tracking...', 'success');
        const tx = await daoV2Contract.fastTrack(currentFastTrackId, duration);
        await tx.wait();
        showToast('Proposal fast-tracked!', 'success');
        closeFastTrackModal();
        await loadProposals();
    } catch (error) {
        console.error(error);
        showToast(error.reason || 'Failed to fast-track', 'error');
    }
}

// Token Vote Modal
function openTokenVoteModal(id) {
    currentTokenVoteId = id;
    document.getElementById('token-vote-modal').classList.remove('hidden');
}

function closeTokenVoteModal() {
    currentTokenVoteId = null;
    document.getElementById('token-vote-modal').classList.add('hidden');
}

async function confirmTokenVote(approve) {
    const amount = document.getElementById('token-vote-amount').value;
    try {
        showToast('Approving tokens...', 'success');
        const amountWei = ethers.parseEther(amount);
        await govTokenContract.approve(CONTRACTS.daoV2, amountWei);

        showToast('Voting...', 'success');
        const tx = await daoV2Contract.voteReferendum(currentTokenVoteId, approve, amountWei);
        await tx.wait();
        showToast(approve ? 'Voted Aye!' : 'Voted Nay!', 'success');
        closeTokenVoteModal();
        await loadProposals();
        await loadUserInfo();
    } catch (error) {
        console.error(error);
        showToast(error.reason || 'Failed to vote', 'error');
    }
}

// Admin Functions
async function addCouncilMember() {
    const address = document.getElementById('add-council-address').value;
    if (!ethers.isAddress(address)) { showToast('Invalid address', 'error'); return; }
    try {
        showToast('Adding council member...', 'success');
        const tx = await rolesContract.addCouncilMember(address);
        await tx.wait();
        showToast('Council member added!', 'success');
        await loadUserInfo();
    } catch (error) {
        showToast(error.reason || 'Failed (are you admin?)', 'error');
    }
}

async function removeCouncilMember() {
    const address = document.getElementById('remove-council-address').value;
    if (!ethers.isAddress(address)) { showToast('Invalid address', 'error'); return; }
    try {
        showToast('Removing council member...', 'success');
        const tx = await rolesContract.removeCouncilMember(address);
        await tx.wait();
        showToast('Council member removed!', 'success');
    } catch (error) {
        showToast(error.reason || 'Failed (are you admin?)', 'error');
    }
}

async function addTCMember() {
    const address = document.getElementById('add-tc-address').value;
    if (!ethers.isAddress(address)) { showToast('Invalid address', 'error'); return; }
    try {
        showToast('Adding TC member...', 'success');
        const tx = await rolesContract.addTechnicalCommitteeMember(address);
        await tx.wait();
        showToast('TC member added!', 'success');
        await loadUserInfo();
    } catch (error) {
        showToast(error.reason || 'Failed (are you admin?)', 'error');
    }
}

async function removeTCMember() {
    const address = document.getElementById('remove-tc-address').value;
    if (!ethers.isAddress(address)) { showToast('Invalid address', 'error'); return; }
    try {
        showToast('Removing TC member...', 'success');
        const tx = await rolesContract.removeTechnicalCommitteeMember(address);
        await tx.wait();
        showToast('TC member removed!', 'success');
    } catch (error) {
        showToast(error.reason || 'Failed (are you admin?)', 'error');
    }
}

// Toast
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Start
document.addEventListener('DOMContentLoaded', init);
