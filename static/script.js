/* Global variables for managing authentication and state */
let accessToken = ''; // Stores user authentication token
let userRole = 'User'; // Tracks user's role (Public, Government, Merchant)
let userOfficialId = null; //.Concurrent Stores government official ID
let editingItemId = null; // Tracks ID of critical item being edited
let editingVaccinationId = null; // Tracks ID of vaccination record being edited
let editingIndividualId = null; // Tracks ID of individual record being edited
let editingMerchantId = null; // Tracks ID of merchant record being edited
let editingMerchantStockId = null; // Tracks ID of merchant stock being edited
let editingPurchaseId = null; // Tracks ID of purchase being edited

/* Displays the specified page while hiding others */
function showPage(page) {
    const pages = ['register', 'login', 'welcome', 'dashboard'];
    pages.forEach(p => {
        const element = document.getElementById(`${p}-page`);
        if (element) {
            element.style.display = p === page ? 'flex' : 'none';
        } else {
            console.warn(`Page element '${p}-page' not found`);
        }
    });

    /* Set default dashboard section based on user role */
    if (page === 'dashboard') {
        if (userRole === 'Merchant') {
            showSection('merchant');
        } else if (userRole === 'Public') {
            showSection('individual');
        } else if (userRole === 'Government') {
            showSection('individual');
        }
    }

    /* Update welcome page with user role */
    if (page === 'welcome') {
        const welcomeRole = document.getElementById('welcome-role');
        if (welcomeRole) {
            welcomeRole.textContent = `Welcome, ${userRole}`;
        } else {
            console.warn("Element 'welcome-role' not found");
        }
    }

    /* Clear login and register messages */
    const loginMessage = document.getElementById('login-message');
    const registerMessage = document.getElementById('register-message');
    if (loginMessage) {
        loginMessage.textContent = '';
    } else {
        console.warn("Element 'login-message' not found");
    }
    if (registerMessage) {
        registerMessage.textContent = '';
    } else {
        console.warn("Element 'register-message' not found");
    }
}

/* Toggles visibility of sidebar navigation buttons based on user role */
function toggleSidebarButtons() {
    const buttons = document.querySelectorAll('.nav-buttons button');
    buttons.forEach(button => {
        if (userRole === 'Public' || userRole === 'Government' || userRole === 'Merchant') {
            button.style.display = 'block';
        } else {
            button.style.display = 'none';
        }
    });
}

/* Toggles visibility of Update/Delete buttons for individual records */
function toggleIndividualActions() {
    const rows = document.querySelectorAll('#individual-table tbody tr');
    rows.forEach(row => {
        const isOwnRecord = row.getAttribute('data-is-own-record') === 'true';
        const updateButton = row.querySelector('.update-button');
        const deleteButton = row.querySelector('.delete-button');

        if (!updateButton || !deleteButton) {
            console.warn('Update or Delete button missing in row:', row);
            return;
        }

        if (userRole === 'Government') {
            updateButton.style.display = 'inline-block';
            deleteButton.style.display = 'inline-block';
        } else if (userRole === 'Public') {
            updateButton.style.display = isOwnRecord ? 'inline-block' : 'none';
            deleteButton.style.display = 'none';
        } else {
            updateButton.style.display = 'none';
            deleteButton.style.display = 'none';
        }
    });
}

/* Toggles visibility of Update/Delete buttons for merchant records */
function toggleMerchantActions() {
    const rows = document.querySelectorAll('#merchant-table tbody tr');
    rows.forEach(row => {
        const isOwnRecord = row.getAttribute('data-is-own-record') === 'true';
        const updateButton = row.querySelector('.update-button');
        const deleteButton = row.querySelector('.delete-button');

        if (userRole === 'Government') {
            updateButton.style.display = 'inline-block';
            deleteButton.style.display = 'inline-block';
        } else if (userRole === 'Merchant') {
            updateButton.style.display = isOwnRecord ? 'inline-block' : 'none';
            deleteButton.style.display = 'none';
        } else {
            updateButton.style.display = 'none';
            deleteButton.style.display = 'none';
        }
    });
}

/* Toggles visibility of action buttons for critical items */
function toggleCriticalItemActions() {
    const actionButtons = document.querySelectorAll('#critical-item-table .action-buttons');
    actionButtons.forEach(button => {
        button.style.display = userRole === 'Government' ? 'inline-block' : 'none';
    });
}

/* Toggles visibility of Update/Delete buttons for merchant stock */
function toggleMerchantStockActions() {
    const rows = document.querySelectorAll('#merchant-stock-table tbody tr');
    const message = document.getElementById('merchant-stock-message');
    if (!message) {
        console.error('Merchant stock message element not found');
        return;
    }
    rows.forEach(row => {
        if (row.cells.length < 2) {
            console.warn('Table row has insufficient cells:', row);
            message.textContent = 'Error: Invalid table data';
            return;
        }
        const merchantIdText = row.cells[1].textContent;
        const merchantId = parseInt(merchantIdText);
        if (isNaN(merchantId)) {
            console.warn('Invalid merchant ID in row:', merchantIdText);
            message.textContent = 'Error: Invalid merchant ID in table';
            return;
        }
        const updateButton = row.querySelector('.update-button');
        const deleteButton = row.querySelector('.delete-button');

        if (!updateButton || !deleteButton) {
            console.warn('Update or Delete button missing in row:', row);
            message.textContent = 'Error: Table buttons missing';
            return;
        }

        if (userRole === 'Government') {
            updateButton.style.display = 'inline-block';
            deleteButton.style.display = 'inline-block';
        } else if (userRole === 'Merchant') {
            fetch('http://localhost:8000/api/v1/user-profile/', {
                headers: { 
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            })
            .then(response => response.json())
            .then(userProfile => {
                const isOwnRecord = userProfile.merchant_id && merchantId === userProfile.merchant_id;
                updateButton.style.display = isOwnRecord ? 'inline-block' : 'none';
                deleteButton.style.display = 'none'; 
            })
            .catch(error => {
                console.error('Error fetching user profile:', error);
                updateButton.style.display = 'none';
                deleteButton.style.display = 'none';
                message.textContent = 'Error: Failed to verify user profile';
            });
        } else {
            updateButton.style.display = 'none';
            deleteButton.style.display = 'none';
        }
    });
}

/* Toggles visibility of Update/Delete buttons for purchases */
function togglePurchaseActions() {
    const rows = document.querySelectorAll('#purchase-table tbody tr');
    rows.forEach(row => {
        if (row.cells.length < 3) {
            console.error('Table row does not have enough cells:', row);
            return;
        }
        const merchantId = parseInt(row.cells[2].textContent);
        const updateButton = row.querySelector('.update-button');
        const deleteButton = row.querySelector('.delete-button');

        if (!updateButton || !deleteButton) {
            console.error('Update or Delete button not found in row:', row);
            return;
        }

        if (userRole === 'Government') {
            updateButton.style.display = 'inline-block';
            deleteButton.style.display = 'inline-block';
        } else if (userRole === 'Merchant') {
            fetch('http://localhost:8000/api/v1/user-profile/', {
                headers: { 
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            })
            .then(response => response.json())
            .then(userProfile => {
                const isOwnRecord = userProfile.merchant_id && merchantId === userProfile.merchant_id;
                updateButton.style.display = isOwnRecord ? 'inline-block' : 'none';
                deleteButton.style.display = 'none';
            })
            .catch(error => {
                console.error('Error fetching user profile:', error);
                updateButton.style.display = 'none';
                deleteButton.style.display = 'none';
            });
        } else {
            updateButton.style.display = 'none';
            deleteButton.style.display = 'none';
        }
    });
}

/* Toggles visibility of action buttons for vaccination records */
function toggleVaccinationActions() {
    const actionButtons = document.querySelectorAll('#vaccination-table .action-buttons');
    actionButtons.forEach(button => {
        button.style.display = userRole === 'Government' ? 'inline-block' : 'none';
    });
}

/* Displays the specified section while hiding others */
function showSection(section) {
    const sections = [
        'individual', 'merchant', 'critical-item', 'merchant-stock',
        'purchase', 'vaccination', 'government-official', 'access-log'
    ];
    sections.forEach(s => {
        const sectionElement = document.getElementById(`${s}-section`);
        const messageElement = document.getElementById(`${s}-message`);
        if (sectionElement) {
            sectionElement.style.display = s === section ? 'block' : 'none';
        } else {
            console.warn(`Section element '${s}-section' not found`);
        }
        if (messageElement) {
            messageElement.textContent = '';
        } else {
            console.warn(`Message element '${s}-message' not found`);
        }
    });

    /* Load data and configure UI for selected section */
    if (section === 'individual') {
        if (userRole === 'Merchant') {
            document.getElementById('individual-message').textContent = 'Error: Merchants do not have access to individual records.';
            document.querySelector('#individual-table tbody').innerHTML = '<tr><td colspan="5">Access denied</td></tr>';
        } else {
            loadIndividuals();
            cancelIndividualUpdate();
            toggleIndividualActions();
        }
    } else if (section === 'merchant') {
        loadMerchants();
        cancelMerchantUpdate();
        toggleMerchantActions();
    } else if (section === 'critical-item') {
        loadCriticalItems();
        cancelUpdate();
        toggleCriticalItemActions();
    } else if (section === 'merchant-stock') {
        loadStockMerchants();
        loadStockItems();
        loadMerchantStock();
        cancelMerchantStockUpdate();
        toggleMerchantStockActions();
    } else if (section === 'purchase') {
        const purchaseSection = document.getElementById('purchase-section');
        if (purchaseSection) {
            loadPurchasePRSIDs();
            loadPurchaseMerchants();
            loadPurchaseItems();
            loadPurchases();
            cancelPurchaseUpdate();
            togglePurchaseActions();
        } else {
            console.error('Purchase section not found in the DOM');
        }
    } else if (section === 'government-official') {
        if (userRole !== 'Government') {
            document.getElementById('government-official-message').textContent = 'Error: Only government users can view government officials.';
            document.querySelector('#government-official-table tbody').innerHTML = '<tr><td colspan="5">Access denied</td></tr>';
        } else {
            loadGovernmentOfficials();
        }
    } else if (section === 'access-log') {
        if (userRole !== 'Government') {
            document.getElementById('access-log-message').textContent = 'Error: Only government users can view access logs';
            document.querySelector('#access-log-table tbody').innerHTML = '<tr><td colspan="4">Access denied</td></tr>';
        } else {
            loadAccessLogs();
        }
    } else if (section === 'vaccination') {
        loadVaccinationPRSIDs();
        loadVaccinationRecords();
        cancelVaccinationUpdate();
        toggleVaccinationActions();
    }
}

/* Resets authentication and state, returns to login page */
function logout() {
    accessToken = '';
    userRole = 'User';
    userOfficialId = null;
    editingItemId = null;
    showPage('login');
    document.querySelectorAll('.content > div[id$="-section"]').forEach(section => {
        section.style.display = 'none';
    });
}

/* Fetches government official ID for the logged-in user */
async function fetchOfficialId(username) {
    try {
        const response = await fetch('http://localhost:8000/api/v1/government-officials/', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        const officials = await response.json();
        if (response.ok) {
            const official = officials.find(o => o.username === username);
            userOfficialId = official ? official.official_id : null;
        } else {
            userOfficialId = null;
        }
    } catch (error) {
        userOfficialId = null;
        console.error('Error fetching official ID:', error);
    }
}

/* Loads and displays individual records */
async function loadIndividuals() {
    const tableBody = document.querySelector('#individual-table tbody');
    const message = document.getElementById('individual-message');
    
    if (userRole === 'Merchant') {
        message.textContent = 'Error: Merchants do not have access to individual records.';
        tableBody.innerHTML = '<tr><td colspan="5">Access denied</td></tr>';
        return;
    }
    try {
        const response = await fetch('http://localhost:8000/api/v1/individuals/', {
            headers: { 
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch individuals');
        }
        
        let items = await response.json();
        let userPrsId = null;

        if (userRole === 'Public') {
            const userPrsIdResponse = await fetch('http://localhost:8000/api/v1/user-profile/', {
                headers: { 
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            const userProfile = await userPrsIdResponse.json();
            if (userProfile.prs_id) {
                userPrsId = userProfile.prs_id;
                items = items.filter(item => item.prs_id === userProfile.prs_id);
            } else {
                items = [];
            }
        }

        tableBody.innerHTML = '';
        
        if (items.length === 0) {
            message.textContent = userRole === 'Public' ? 'No individual record found. Create one below.' : 'No individuals found';
            tableBody.innerHTML = '<tr><td colspan="5">No records available</td></tr>';
        } else {
            items.forEach(item => {
                const prsId = item.prs_id || 'N/A';
                const nationalId = item.national_identifier || 'N/A';
                const isOwnRecord = userRole === 'Public' && userPrsId && item.prs_id === userPrsId;
                const row = `
                    <tr data-is-own-record="${isOwnRecord}">
                        <td>PRS-${prsId.substring(0, 8).toUpperCase()}</td>
                        <td>••••${nationalId.substring(nationalId.length-4)}</td>
                        <td>${new Date(item.date_of_birth).toLocaleDateString()}</td>
                        <td>${new Date(item.created_at).toLocaleString()}</td>
                        <td>
                            <button class="action-buttons update-button" onclick="editIndividualRecord('${item.prs_id}', '${item.national_identifier}', '${item.date_of_birth}')">Update</button>
                            <button class="action-buttons delete-button" onclick="deleteIndividual('${item.prs_id}')">Delete</button>
                        </td>
                    </tr>
                `;
                tableBody.innerHTML += row;
            });
        }
        toggleIndividualActions();
    } catch (error) {
        message.textContent = 'Error: ' + error.message;
    }
}

/* Populates individual form for editing */
function editIndividualRecord(prsId, nationalIdentifier, dateOfBirth) {
    if (userRole === 'Public') {
        fetch('http://localhost:8000/api/v1/user-profile/', {
            headers: { 
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(userProfile => {
            if (!userProfile.prs_id || userProfile.prs_id !== prsId) {
                document.getElementById('individual-message').textContent = 'Error: You can only update your own individual record';
                return;
            }
            editingIndividualId = prsId;
            document.getElementById('ind_prs_id').value = prsId;
            document.getElementById('ind_national_identifier').value = nationalIdentifier;
            document.getElementById('ind_date_of_birth').value = dateOfBirth;
            document.getElementById('individual-submit').textContent = 'Update Individual';
            document.getElementById('cancel-individual-update').style.display = 'inline-block';
        })
        .catch(error => {
            document.getElementById('individual-message').textContent = 'Error: ' + error.message;
        });
    } else if (userRole === 'Government') {
        editingIndividualId = prsId;
        document.getElementById('ind_prs_id').value = prsId;
        document.getElementById('ind_national_identifier').value = nationalIdentifier;
        document.getElementById('ind_date_of_birth').value = dateOfBirth;
        document.getElementById('individual-submit').textContent = 'Update Individual';
        document.getElementById('cancel-individual-update').style.display = 'inline-block';
    } else {
        document.getElementById('individual-message').textContent = 'Error: Only government users or the individual themselves can update records';
    }
}

/* Resets individual form and clears editing state */
function cancelIndividualUpdate() {
    editingIndividualId = null;
    document.getElementById('individual-form').reset();
    document.getElementById('ind_prs_id').value = '';
    document.getElementById('individual-submit').textContent = 'Create Individual';
    document.getElementById('cancel-individual-update').style.display = 'none';
    document.getElementById('individual-message').textContent = '';
}

/* Deletes an individual record */
async function deleteIndividual(prsId) {
    if (userRole !== 'Government') {
        document.getElementById('individual-message').textContent = 'Error: Only government users can delete individuals';
        return;
    }
    if (!confirm('Are you sure you want to delete this individual?')) return;

    try {
        const response = await fetch(`http://localhost:8000/api/v1/individuals/${prsId}/`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (response.ok) {
            document.getElementById('individual-message').textContent = 'Individual deleted successfully';
            document.getElementById('individual-message').style.color = 'green';
            loadIndividuals();
            loadVaccinationPRSIDs();
            if (editingIndividualId === prsId) cancelIndividualUpdate();
        } else {
            const error = await response.json();
            document.getElementById('individual-message').textContent = error.detail || 'Failed to delete individual';
        }
    } catch (error) {
        document.getElementById('individual-message').textContent = 'Error: ' + error.message;
    }
}

/* Loads and displays merchant records */
async function loadMerchants() {
    const tableBody = document.querySelector('#merchant-table tbody');
    const message = document.getElementById('merchant-message');
    
    try {
        const response = await fetch('http://localhost:8000/api/v1/merchants/', {
            headers: { 
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to fetch merchants');
        }
        
        let items = await response.json();
        let userMerchantId = null;

        if (userRole === 'Merchant') {
            const userProfileResponse = await fetch('http://localhost:8000/api/v1/user-profile/', {
                headers: { 
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            const userProfile = await userProfileResponse.json();
            console.log('User Profile:', userProfile);
            if (userProfile.merchant_id) {
                userMerchantId = Number(userProfile.merchant_id);
                console.log('userMerchantId:', userMerchantId);
                items = items.filter(item => item.merchant_id === userMerchantId);
            } else {
                console.log('No merchant record associated with userProfile');
                items = [];
            }
        }

        tableBody.innerHTML = '';
        
        if (items.length === 0) {
            message.textContent = userRole === 'Merchant' ? 'No merchant record found. Create one below.' : 'No merchants found';
            tableBody.innerHTML = '<tr><td colspan="5">No records available</td></tr>';
        } else {
            items.forEach(item => {
                console.log('Item:', item);
                const isOwnRecord = userRole === 'Merchant' && userMerchantId && item.merchant_id === userMerchantId;
                console.log(`isOwnRecord: ${isOwnRecord}, item.merchant_id: ${item.merchant_id}, userMerchantId: ${userMerchantId}`);
                const row = `
                    <tr data-is-own-record="${isOwnRecord}">
                        <td>${item.merchant_id}</td>
                        <td>${item.name}</td>
                        <td>${item.address}</td>
                        <td>${item.created_at}</td>
                        <td>
                            <button class="action-buttons update-button" onclick="editMerchantRecord(${item.merchant_id}, '${item.business_license}', '${item.name.replace(/'/g, "\\'")}', '${item.address.replace(/'/g, "\\'")}')">Update</button>
                            <button class="action-buttons delete-button" onclick="deleteMerchant(${item.merchant_id})">Delete</button>
                        </td>
                    </tr>
                `;
                tableBody.innerHTML += row;
            });
        }
        toggleMerchantActions();
    } catch (error) {
        message.textContent = 'Error: ' + error.message;
        tableBody.innerHTML = '<tr><td colspan="5">Unable to load merchants</td></tr>';
    }
}

/* Populates merchant form for editing */
function editMerchantRecord(merchantId, businessLicense, name, address) {
    if (userRole === 'Merchant') {
        fetch('http://localhost:8000/api/v1/user-profile/', {
            headers: { 
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(userProfile => {
            if (!userProfile.merchant_id || Number(userProfile.merchant_id) !== merchantId) {
                document.getElementById('merchant-message').textContent = 'Error: You can only update your own merchant record';
                return;
            }
            editingMerchantId = merchantId;
            document.getElementById('merch_id').value = merchantId;
            document.getElementById('merch_business_license').value = businessLicense;
            document.getElementById('merch_name').value = name;
            document.getElementById('merch_address').value = address;
            document.getElementById('merchant-submit').textContent = 'Update Merchant';
            document.getElementById('cancel-merchant-update').style.display = 'inline-block';
        })
        .catch(error => {
            document.getElementById('merchant-message').textContent = 'Error: ' + error.message;
        });
    } else if (userRole === 'Government') {
        editingMerchantId = merchantId;
        document.getElementById('merch_id').value = merchantId;
        document.getElementById('merch_business_license').value = businessLicense;
        document.getElementById('merch_name').value = name;
        document.getElementById('merch_address').value = address;
        document.getElementById('merchant-submit').textContent = 'Update Merchant';
        document.getElementById('cancel-merchant-update').style.display = 'inline-block';
    } else {
        document.getElementById('merchant-message').textContent = 'Error: Only government users or the merchant themselves can update records';
    }
}

/* Resets merchant form and clears editing state */
function cancelMerchantUpdate() {
    editingMerchantId = null;
    document.getElementById('merchant-form').reset();
    document.getElementById('merch_id').value = '';
    document.getElementById('merchant-submit').textContent = 'Create Merchant';
    document.getElementById('cancel-merchant-update').style.display = 'none';
    document.getElementById('merchant-message').textContent = '';
}

/* Deletes a merchant record */
async function deleteMerchant(merchantId) {
    if (userRole !== 'Government') {
        document.getElementById('merchant-message').textContent = 'Error: Only government users can delete merchants';
        return;
    }
    if (!confirm('Are you sure you want to delete this merchant?')) return;
    
    try {
        const response = await fetch(`http://localhost:8000/api/v1/merchants/${merchantId}/`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete merchant');
        }
        
        document.getElementById('merchant-message').textContent = 'Merchant deleted successfully!';
        document.getElementById('merchant-message').style.color = 'green';
        loadMerchants();
        if (editingMerchantId === merchantId) cancelMerchantUpdate();
    } catch (error) {
        document.getElementById('merchant-message').textContent = 'Error: ' + error.message;
    }
}

/* Loads and displays critical items */
async function loadCriticalItems() {
    const tableBody = document.querySelector('#critical-item-table tbody');
    const message = document.getElementById('critical-item-message');
    
    try {
        const response = await fetch('http://localhost:8000/api/v1/critical-items/', {
            headers: { 
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to fetch critical items');
        }
        
        const items = await response.json();
        tableBody.innerHTML = '';
        
        if (items.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6">No critical items found</td></tr>';
        } else {
            items.forEach(item => {
                const row = `
                    <tr>
                        <td>${item.item_id}</td>
                        <td>${item.name}</td>
                        <td>${item.purchase_limit}</td>
                        <td>${item.limit_period}</td>
                        <td>${item.allowed_purchase_day || 'N/A'}</td>
                        <td>
                            <button class="action-buttons" onclick="editCriticalItem(${item.item_id}, '${item.name.replace(/'/g, "\\'")}', ${item.purchase_limit}, '${item.limit_period}', '${item.allowed_purchase_day || ''}')">Update</button>
                            <button class="action-buttons" onclick="deleteCriticalItem(${item.item_id})">Delete</button>
                        </td>
                    </tr>
                `;
                tableBody.innerHTML += row;
            });
        }
        toggleCriticalItemActions();
    } catch (error) {
        message.textContent = 'Error: ' + error.message;
        tableBody.innerHTML = '<tr><td colspan="6">Unable to load critical items</td></tr>';
    }
}

/* Populates critical item form for editing */
function editCriticalItem(itemId, name, purchaseLimit, limitPeriod, allowedDay) {
    if (userRole !== 'Government') {
        document.getElementById('critical-item-message').textContent = 'Error: Only government users can update items';
        return;
    }
    editingItemId = itemId;
    document.getElementById('item_id').value = itemId;
    document.getElementById('item_name').value = name;
    document.getElementById('purchase_limit').value = purchaseLimit;
    document.getElementById('limit_period').value = limitPeriod;
    document.getElementById('allowed_day').value = allowedDay || '';
    document.getElementById('critical-item-submit').textContent = 'Update Critical Item';
    document.getElementById('cancel-update').style.display = 'inline-block';
}

/* Resets critical item form and clears editing state */
function cancelUpdate() {
    editingItemId = null;
    document.getElementById('critical-item-form').reset();
    document.getElementById('item_id').value = '';
    document.getElementById('critical-item-submit').textContent = 'Add Critical Item';
    document.getElementById('cancel-update').style.display = 'none';
    document.getElementById('critical-item-message').textContent = '';
}

/* Deletes a critical item */
async function deleteCriticalItem(itemId) {
    if (userRole !== 'Government') {
        document.getElementById('critical-item-message').textContent = 'Error: Only government users can delete items';
        return;
    }
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    try {
        const response = await fetch(`http://localhost:8000/api/v1/critical-items/${itemId}/`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        
        if (response.ok) {
            document.getElementById('critical-item-message').textContent = 'Item deleted successfully!';
            document.getElementById('critical-item-message').style.color = 'green';
            loadCriticalItems();
            if (editingItemId === itemId) cancelUpdate();
        } else {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to delete item');
        }
    } catch (error) {
        document.getElementById('critical-item-message').textContent = 'Error: ' + error.message;
    }
}

/* Loads merchants for stock selection dropdown */
/* Loads merchants for stock selection dropdown */
async function loadStockMerchants() {
    const merchantSelect = document.getElementById('stock_merchant');
    const message = document.getElementById('merchant-stock-message');
    if (!merchantSelect || !message) {
        console.error('Stock merchant select or message element not found in DOM');
        return;
    }

    try {
        // Fetch all merchants
        const response = await fetch('http://localhost:8000/api/v1/merchants/', {
            headers: { 
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to fetch merchants');
        }

        let items = await response.json();
        console.log('Fetched merchants:', items); // Debug: Log merchant data

        // Filter merchants for Merchant role
        if (userRole === 'Merchant') {
            const userProfileResponse = await fetch('http://localhost:8000/api/v1/user-profile/', {
                headers: { 
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!userProfileResponse.ok) {
                throw new Error('Failed to fetch user profile');
            }
            const userProfile = await userProfileResponse.json();
            console.log('User profile:', userProfile); // Debug: Log user profile

            if (!userProfile.merchant_id) {
                console.warn('No merchant_id found in user profile');
                message.textContent = 'Error: No merchant record associated with this user. Create one in Manage Merchants.';
                merchantSelect.innerHTML = '<option value="">No merchants available</option>';
                return;
            }

            // Filter to only the user's merchant_id
            items = items.filter(item => item.merchant_id === userProfile.merchant_id);
            console.log('Filtered merchants for Merchant role:', items); // Debug: Log filtered merchants
        }

        // Populate dropdown
        merchantSelect.innerHTML = '<option value="">Select Merchant ID</option>';
        if (items.length === 0) {
            console.warn('No merchants available after filtering');
            message.textContent = userRole === 'Merchant' ? 'No merchant record found. Create one in Manage Merchants.' : 'No merchants available';
            merchantSelect.innerHTML = '<option value="">No merchants available</option>';
        } else {
            items.forEach(item => {
                if (item.merchant_id) { // Ensure merchant_id exists
                    const option = document.createElement('option');
                    option.value = item.merchant_id;
                    option.textContent = `${item.merchant_id} - ${item.name || 'Unnamed Merchant'}`; // Include name for clarity
                    merchantSelect.appendChild(option);
                } else {
                    console.warn('Merchant item missing merchant_id:', item);
                }
            });
            console.log('Merchant dropdown populated with', items.length, 'options');
        }
    } catch (error) {
        console.error('Error loading stock merchants:', error);
        message.textContent = 'Error: ' + error.message;
        merchantSelect.innerHTML = '<option value="">Error loading merchants</option>';
    }
}

/* Loads items for stock selection dropdown */
async function loadStockItems() {
    const itemSelect = document.getElementById('stock_item');
    const message = document.getElementById('merchant-stock-message');
    try {
        const response = await fetch('http://localhost:8000/api/v1/critical-items/', {
            headers: { 
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            throw new Error('Failed to fetch critical items');
        }
        const items = await response.json();
        itemSelect.innerHTML = '<option value="">Select Item ID</option>';
        items.forEach(item => {
            const option = document.createElement('option');
            option.value = item.item_id;
            option.textContent = item.item_id;
            itemSelect.appendChild(option);
        });
    } catch (error) {
        message.textContent = 'Error: ' + error.message;
    }
}

/* Loads and displays merchant stock records */
async function loadMerchantStock() {
    const tableBody = document.querySelector('#merchant-stock-table tbody');
    const message = document.getElementById('merchant-stock-message');
    if (!tableBody || !message) {
        console.error('Merchant stock table body or message element not found');
        return;
    }
    try {
        const response = await fetch('http://localhost:8000/api/v1/merchant-stock/', {
            headers: { 
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to fetch merchant stock');
        }
        const items = await response.json();
        tableBody.innerHTML = '';
        if (items.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6">No merchant stock found</td></tr>';
            message.textContent = userRole === 'Merchant' ? 'No stock records found. Add one below.' : 'No merchant stock found';
        } else {
            let userMerchantId = null;
            if (userRole === 'Merchant') {
                const userProfileResponse = await fetch('http://localhost:8000/api/v1/user-profile/', {
                    headers: { 
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                });
                const userProfile = await userProfileResponse.json();
                userMerchantId = userProfile.merchant_id;
                if (!userMerchantId) {
                    message.textContent = 'Error: No merchant ID associated with this user';
                    tableBody.innerHTML = '<tr><td colspan="6">No merchant ID found</td></tr>';
                    return;
                }
            }
            items.forEach(item => {
                // Ensure item has required fields
                if (!item.stock_id || !item.merchant || !item.item || item.stock_level === undefined || !item.last_updated) {
                    console.warn('Invalid stock item data:', item);
                    message.textContent = 'Error: Invalid stock data';
                    return;
                }
                const isOwnRecord = userRole === 'Merchant' && userMerchantId && item.merchant === userMerchantId;
                const row = `
                    <tr data-is-own-record="${isOwnRecord}">
                        <td>${item.stock_id}</td>
                        <td>${item.merchant}</td>
                        <td>${item.item}</td>
                        <td>${item.stock_level}</td>
                        <td>${item.last_updated}</td>
                        <td>
                            <button class="action-buttons update-button" onclick="editMerchantStockRecord(${item.stock_id}, ${item.merchant}, ${item.item}, ${item.stock_level})">Update</button>
                            <button class="action-buttons delete-button" onclick="deleteMerchantStock(${item.stock_id})">Delete</button>
                        </td>
                    </tr>
                `;
                tableBody.innerHTML += row;
            });
        }
        toggleMerchantStockActions();
    } catch (error) {
        console.error('Error loading merchant stock:', error);
        message.textContent = 'Error: ' + error.message;
        tableBody.innerHTML = '<tr><td colspan="6">Unable to load merchant stock</td></tr>';
    }
}

/* Populates merchant stock form for editing */
function editMerchantStockRecord(stockId, merchant, item, stockLevel) {
    if (userRole === 'Merchant') {
        fetch('http://localhost:8000/api/v1/user-profile/', {
            headers: { 
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(userProfile => {
            if (!userProfile.merchant_id || merchant !== userProfile.merchant_id) {
                document.getElementById('merchant-stock-message').textContent = 'Error: You can only update your own merchant stock';
                return;
            }
            editingMerchantStockId = stockId;
            document.getElementById('stock_id').value = stockId;
            document.getElementById('stock_merchant').value = merchant;
            document.getElementById('stock_item').value = item;
            document.getElementById('stock_level').value = stockLevel;
            document.getElementById('merchant-stock-submit').textContent = 'Update Stock';
            document.getElementById('cancel-merchant-stock-update').style.display = 'inline-block';
        })
        .catch(error => {
            document.getElementById('merchant-stock-message').textContent = 'Error: ' + error.message;
        });
    } else if (userRole === 'Government') {
        editingMerchantStockId = stockId;
        document.getElementById('stock_id').value = stockId;
        document.getElementById('stock_merchant').value = merchant;
        document.getElementById('stock_item').value = item;
        document.getElementById('stock_level').value = stockLevel;
        document.getElementById('merchant-stock-submit').textContent = 'Update Stock';
        document.getElementById('cancel-merchant-stock-update').style.display = 'inline-block';
    } else {
        document.getElementById('merchant-stock-message').textContent = 'Error: Only government or merchant users can update merchant stock';
    }
}

/* Resets merchant stock form and clears editing state */
function cancelMerchantStockUpdate() {
    editingMerchantStockId = null;
    document.getElementById('merchant-stock-form').reset();
    document.getElementById('stock_id').value = '';
    document.getElementById('stock_merchant').value = '';
    document.getElementById('stock_item').value = '';
    document.getElementById('merchant-stock-submit').textContent = 'Add Stock';
    document.getElementById('cancel-merchant-stock-update').style.display = 'none';
    document.getElementById('merchant-stock-message').textContent = '';
}

/* Deletes a merchant stock record */
async function deleteMerchantStock(stockId) {
    if (userRole !== 'Government') {
        document.getElementById('merchant-stock-message').textContent = 'Error: Only government users can delete merchant stock';
        return;
    }
    if (!confirm('Are you sure you want to delete this stock record?')) return;
    
    try {
        const response = await fetch(`http://localhost:8000/api/v1/merchant-stock/${stockId}/`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete merchant stock');
        }
        
        document.getElementById('merchant-stock-message').textContent = 'Stock record deleted successfully!';
        document.getElementById('merchant-stock-message').style.color = 'green';
        loadMerchantStock();
        if (editingMerchantStockId === stockId) cancelMerchantStockUpdate();
    } catch (error) {
        document.getElementById('merchant-stock-message').textContent = 'Error: ' + error.message;
    }
}

/* Loads and displays purchase records */
async function loadPurchases() {
    const tableBody = document.querySelector('#purchase-table tbody');
    const message = document.getElementById('purchase-message');
    if (!tableBody || !message) {
        console.error('Purchase table body or message element not found in the DOM');
        return;
    }
    try {
        const response = await fetch('http://localhost:8000/api/v1/purchases/', {
            headers: { 
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to fetch purchases');
        }
        const purchases = await response.json();
        tableBody.innerHTML = '';
        if (purchases.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6">No purchases found</td></tr>';
        } else {
            let userMerchantId = null;
            if (userRole === 'Merchant') {
                const userProfileResponse = await fetch('http://localhost:8000/api/v1/user-profile/', {
                    headers: { 
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                });
                const userProfile = await userProfileResponse.json();
                userMerchantId = userProfile.merchant_id;
            }

            purchases.forEach(purchase => {
                const isOwnRecord = userRole === 'Merchant' && userMerchantId && purchase.merchant === userMerchantId;
                const row = `
                    <tr data-is-own-record="${isOwnRecord}">
                        <td>${purchase.purchase_id || 'N/A'}</td>
                        <td>${purchase.prs_id || 'N/A'}</td>
                        <td>${purchase.merchant || 'N/A'}</td>
                        <td>${purchase.item || 'N/A'}</td>
                        <td>${purchase.quantity || 'N/A'}</td>
                        <td>
                            <button class="action-buttons update-button" onclick="editPurchaseRecord(${purchase.purchase_id}, '${purchase.prs_id}', ${purchase.merchant}, ${purchase.item}, ${purchase.quantity})">Update</button>
                            <button class="action-buttons delete-button" onclick="deletePurchase(${purchase.purchase_id})">Delete</button>
                        </td>
                    </tr>
                `;
                tableBody.innerHTML += row;
            });
        }
        togglePurchaseActions();
    } catch (error) {
        message.textContent = 'Error: ' + error.message;
        tableBody.innerHTML = '<tr><td colspan="6">Unable to load purchases</td></tr>';
    }
}

/* Loads PRS IDs for purchase form dropdown */
async function loadPurchasePRSIDs() {
    const prsSelect = document.getElementById('purchase_prs_id');
    const message = document.getElementById('purchase-message');
    if (!prsSelect || !message) {
        console.error('Purchase PRS ID select or message element not found in the DOM');
        return;
    }
    try {
        const response = await fetch('http://localhost:8000/api/v1/individuals/', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new myselfError(errorData.detail || 'Failed to load individuals');
        }

        let data = await response.json();
        if (userRole === 'Public') {
            const userProfileResponse = await fetch('http://localhost:8000/api/v1/user-profile/', {
                headers: { 
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            const userProfile = await userProfileResponse.json();
            if (userProfile.prs_id) {
                data = data.filter(item => item.prs_id === userProfile.prs_id);
            } else {
                data = [];
            }
        }

        prsSelect.innerHTML = '<option value="">Select PRS ID</option>';
        if (data.length === 0) {
            prsSelect.innerHTML = '<option value="">No PRS ID available</option>';
        } else {
            data.forEach(item => {
                const option = document.createElement('option');
                option.value = item.prs_id;
                option.textContent = item.prs_id;
                prsSelect.appendChild(option);
            });
        }
    } catch (error) {
        message.textContent = 'Error: ' + error.message;
        prsSelect.innerHTML = '<option value="">Error loading PRS IDs</option>';
    }
}

/* Loads merchants for purchase form dropdown */
async function loadPurchaseMerchants() {
    const merchantSelect = document.getElementById('purchase_merchant');
    const message = document.getElementById('purchase-message');
    if (!merchantSelect || !message) {
        console.error('Purchase merchant select or message element not found in the DOM');
        return;
    }
    try {
        const response = await fetch('http://localhost:8000/api/v1/merchants/', {
            headers: { 
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to fetch merchants');
        }
        let items = await response.json();
        if (userRole === 'Merchant') {
            const userProfileResponse = await fetch('http://localhost:8000/api/v1/user-profile/', {
                headers: { 
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            const userProfile = await userProfileResponse.json();
            if (userProfile.merchant_id) {
                items = items.filter(item => item.merchant_id === userProfile.merchant_id);
            } else {
                items = [];
            }
        }
        merchantSelect.innerHTML = '<option value="">Select Merchant ID</option>';
        if (items.length === 0) {
            merchantSelect.innerHTML = '<option value="">No merchants available</option>';
        } else {
            items.forEach(item => {
                const option = document.createElement('option');
                option.value = item.merchant_id;
                option.textContent = item.merchant_id;
                merchantSelect.appendChild(option);
            });
        }
    } catch (error) {
        message.textContent = 'Error: ' + error.message;
        merchantSelect.innerHTML = '<option value="">No merchants available</option>';
    }
}

/* Loads items for purchase form dropdown */
async function loadPurchaseItems() {
    const itemSelect = document.getElementById('purchase_item');
    const message = document.getElementById('purchase-message');
    if (!itemSelect || !message) {
        console.error('Purchase item select or message element not found in the DOM');
        return;
    }
    try {
        const response = await fetch('http://localhost:8000/api/v1/merchant-stock/', {
            headers: { 
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            throw new Error('Failed to fetch merchant stock');
        }
        const items = await response.json();
        const uniqueItemIds = [...new Set(items.map(item => item.item))];
        itemSelect.innerHTML = '<option value="">Select Item ID</option>';
        uniqueItemIds.forEach(itemId => {
            const option = document.createElement('option');
            option.value = itemId;
            option.textContent = itemId;
            itemSelect.appendChild(option);
        });
    } catch (error) {
        message.textContent = 'Error: ' + error.message;
        itemSelect.innerHTML = '<option value="">Error loading items</option>';
    }
}

/* Populates purchase form for editing */
function editPurchaseRecord(purchaseId, prsId, merchant, item, quantity) {
    if (userRole === 'Public') {
        document.getElementById('purchase-message').textContent = 'Error: Public users cannot update purchases';
        return;
    }
    if (userRole === 'Merchant') {
        fetch('http://localhost:8000/api/v1/user-profile/', {
            headers: { 
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(userProfile => {
            if (!userProfile.merchant_id || merchant !== userProfile.merchant_id) {
                document.getElementById('purchase-message').textContent = 'Error: You can only update your own purchases';
                return;
            }
            editingPurchaseId = purchaseId;
            document.getElementById('purchase_id').value = purchaseId;
            document.getElementById('purchase_prs_id').value = prsId;
            document.getElementById('purchase_merchant').value = merchant;
            document.getElementById('purchase_item').value = item;
            document.getElementById('purchase_quantity').value = quantity;
            document.getElementById('purchase-submit').textContent = 'Update Purchase';
            document.getElementById('cancel-purchase-update').style.display = 'inline-block';
        })
        .catch(error => {
            document.getElementById('purchase-message').textContent = 'Error: ' + error.message;
        });
    } else if (userRole === 'Government') {
        editingPurchaseId = purchaseId;
        document.getElementById('purchase_id').value = purchaseId;
        document.getElementById('purchase_prs_id').value = prsId;
        document.getElementById('purchase_merchant').value = merchant;
        document.getElementById('purchase_item').value = item;
        document.getElementById('purchase_quantity').value = quantity;
        document.getElementById('purchase-submit').textContent = 'Update Purchase';
        document.getElementById('cancel-purchase-update').style.display = 'inline-block';
    }
}

/* Resets purchase form and clears editing state */
function cancelPurchaseUpdate() {
    editingPurchaseId = null;
    const purchaseIdInput = document.getElementById('purchase_id');
    const prsSelect = document.getElementById('purchase_prs_id');
    const merchantSelect = document.getElementById('purchase_merchant');
    const itemSelect = document.getElementById('purchase_item');
    const quantityInput = document.getElementById('purchase_quantity');
    const submitButton = document.getElementById('purchase-submit');
    const cancelButton = document.getElementById('cancel-purchase-update');

    if (!purchaseIdInput || !prsSelect || !merchantSelect || !itemSelect || !quantityInput || !submitButton || !cancelButton) {
        console.error('One or more purchase form elements not found in the DOM');
        return;
    }

    purchaseIdInput.value = '';
    prsSelect.value = '';
    merchantSelect.value = '';
    itemSelect.value = '';
    quantityInput.value = '';
    submitButton.textContent = 'Add Purchase';
    cancelButton.style.display = 'none';
    const message = document.getElementById('purchase-message');
    if (message) {
        message.textContent = userRole === 'Public' ? 'Read-only access: You can initiate purchases but cannot modify existing ones.' : '';
    }
}

/* Deletes a purchase record */
async function deletePurchase(purchaseId) {
    if (userRole !== 'Government') {
        document.getElementById('purchase-message').textContent = 'Error: Only government users can delete purchases';
        return;
    }
    const message = document.getElementById('purchase-message');
    try {
        const response = await fetch(`http://localhost:8000/api/v1/purchases/${purchaseId}/`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (response.ok) {
            message.textContent = 'Purchase deleted successfully!';
            message.style.color = 'green';
            loadPurchases();
        } else {
            const errorData = await response.json();
            message.textContent = errorData.detail || 'Failed to delete purchase';
        }
    } catch (error) {
       警方
        message.textContent = 'Error: ' + error.message;
    }
}

/* Loads and displays vaccination records */
async function loadVaccinationRecords() {
    const tableBody = document.querySelector('#vaccination-table tbody');
    const message = document.getElementById('vaccination-message');
    try {
        const response = await fetch('http://localhost:8000/api/v1/vaccination-records/', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const data = await response.json();
        if (response.ok) {
            tableBody.innerHTML = '';
            data.forEach(item => {
                const row = `<tr>
                    <td>${item.record_id}</td>
                    <td>PRS-${item.prs_id.substring(0, 8).toUpperCase()}</td>
                    <td>${item.vaccine_type}</td>
                    <td>${item.dose_number}</td>
                    <td>${new Date(item.vaccination_date).toLocaleDateString()}</td>
                    <td>${item.status}</td>
                    <td>
                        <button class="action-buttons" onclick="editVaccinationRecord(${item.record_id}, '${item.prs_id}', '${item.vaccine_type.replace(/'/g, "\\'")}', '${item.manufacturer || ''}', ${item.dose_number}, '${item.batch_number || ''}', '${item.vaccination_date}', '${item.administered_by || ''}', '${item.status}')">Update</button>
                        <button class="action-buttons" onclick="deleteVaccinationRecord(${item.record_id})">Delete</button>
                    </td>
                </tr>`;
                tableBody.innerHTML += row;
            });
            toggleVaccinationActions();
        } else {
            message.textContent = data.detail || 'Failed to load vaccination records';
        }
    } catch (error) {
        message.textContent = 'Error: ' + error.message;
    }
}

/* Loads PRS IDs for vaccination form dropdown */
async function loadVaccinationPRSIDs() {
    const prsSelect = document.getElementById('vacc_prs_id');
    const message = document.getElementById('vaccination-message');
    try {
        const response = await fetch('http://localhost:8000/api/v1/individuals/', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to load individuals');
        }

        let data = await response.json();
        if (userRole === 'Public') {
            const userProfileResponse = await fetch('http://localhost:8000/api/v1/user-profile/', {
                headers: { 
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            const userProfile = await userProfileResponse.json();
            if (userProfile.prs_id) {
                data = data.filter(item => item.prs_id === userProfile.prs_id);
            } else {
                data = [];
            }
        }

        prsSelect.innerHTML = '<option value="">Select PRS ID</option>';
        if (data.length === 0) {
            prsSelect.innerHTML = '<option value="">No PRS ID available</option>';
        } else {
            data.forEach(item => {
                const option = document.createElement('option');
                option.value = item.prs_id;
                option.textContent = item.prs_id;
                prsSelect.appendChild(option);
            });
        }
    } catch (error) {
        message.textContent = 'Error: ' + error.message;
        prsSelect.innerHTML = '<option value="">Error loading PRS IDs</option>';
    }
}

/* Populates vaccination form for editing */
function editVaccinationRecord(recordId, prsId, vaccineType, manufacturer, doseNumber, batchNumber, vaccinationDate, administeredBy, status) {
    if (userRole !== 'Government') {
        document.getElementById('vaccination-message').textContent = 'Error: Only government users can update vaccination records';
        return;
    }
    editingVaccinationId = recordId;
    document.getElementById('vacc_record_id').value = recordId;
    document.getElementById('vacc_prs_id').value = prsId;
    document.getElementById('vaccine_type').value = vaccineType;
    document.getElementById('manufacturer').value = manufacturer || '';
    document.getElementById('dose_number').value = doseNumber;
    document.getElementById('batch_number').value = batchNumber || '';
    document.getElementById('vaccination_date').value = vaccinationDate;
    document.getElementById('administered_by').value = administeredBy || '';
    document.getElementById('status').value = status;
    document.getElementById('vaccination-submit').textContent = 'Update Vaccination Record';
    document.getElementById('cancel-vaccination-update').style.display = 'inline-block';
}

/* Resets vaccination form and clears editing state */
function cancelVaccinationUpdate() {
    editingVaccinationId = null;
    document.getElementById('vaccination-form').reset();
    document.getElementById('vacc_record_id').value = '';
    document.getElementById('vaccination-submit').textContent = 'Add Vaccination Record';
    document.getElementById('cancel-vaccination-update').style.display = 'none';
    document.getElementById('vaccination-message').textContent = '';
}

/* Deletes a vaccination record */
async function deleteVaccinationRecord(recordId) {
    if (userRole !== 'Government') {
        document.getElementById('vaccination-message').textContent = 'Error: Only government users can delete vaccination records';
        return;
    }
    if (!confirm('Are you sure you want to delete this vaccination record?')) return;

    try {
        const response = await fetch(`http://localhost:8000/api/v1/vaccination-records/${recordId}/`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (response.ok) {
            document.getElementById('vaccination-message').textContent = 'Vaccination record deleted successfully';
            document.getElementById('vaccination-message').style.color = 'green';
            loadVaccinationRecords();
            if (editingVaccinationId === recordId) cancelVaccinationUpdate();
        } else {
            const error = await response.json();
            document.getElementById('vaccination-message').textContent = error.detail || 'Failed to delete vaccination record';
        }
    } catch (error) {
        document.getElementById('vaccination-message').textContent = 'Error: ' + error.message;
    }
}

/* Loads and displays government official records */
async function loadGovernmentOfficials() {
    const tableBody = document.querySelector('#government-official-table tbody');
    const message = document.getElementById('government-official-message');
    
    if (userRole !== 'Government') {
        message.textContent = 'Error: Only government users can view government officials.';
        tableBody.innerHTML = '<tr><td colspan="5">Access denied</td></tr>';
        return;
    }

    try {
        const response = await fetch('http://localhost:8000/api/v1/government-officials/', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const data = await response.json();
        if (response.ok) {
            tableBody.innerHTML = '';
            if (data.length === 0) {
                message.textContent = 'No government official record found for this user.';
                tableBody.innerHTML = '<tr><td colspan="5">No records available</td></tr>';
            } else {
                data.forEach(item => {
                    const row = `<tr>
                        <td>${item.official_id}</td>
                        <td>${item.username}</td>
                        <td>${item.password_hash}</td>
                        <td>${item.role}</td>
                        <td>${item.created_at}</td>
                    </tr>`;
                    tableBody.innerHTML += row;
                });
                message.textContent = '';
            }
        } else {
            message.textContent = data.detail || 'Failed to load your official record.';
        }
    } catch (error) {
        message.textContent = 'Error: ' + error.message;
    }
}

/* Loads and displays access logs */
async function loadAccessLogs() {
    const tableBody = document.querySelector('#access-log-table tbody');
    const message = document.getElementById('access-log-message');
    
    if (userRole !== 'Government') {
        message.textContent = 'Error: Only government users can view access logs';
        tableBody.innerHTML = '';
        return;
    }

    try {
        const url = userOfficialId ? 
            `http://localhost:8000/api/v1/access-logs/?official_id=${userOfficialId}` : 
            'http://localhost:8000/api/v1/access-logs/';
        const response = await fetch(url, {
            headers: { 
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        const data = await response.json();
        
        if (response.ok) {
            tableBody.innerHTML = '';
            data.forEach(item => {
                const row = `<tr>
                    <td>${item.log_id}</td>
                    <td>${item.official}</td>
                    <td>${item.action}</td>
                    <td>${item.timestamp}</td>
                </tr>`;
                tableBody.innerHTML += row;
            });
            if (data.length === 0) {
                message.textContent = 'No access logs found for this user';
                tableBody.innerHTML = '<tr><td colspan="4">No records available</td></tr>';
            }
        } else {
            message.textContent = data.detail || 'Failed to load access logs';
        }
    } catch (error) {
        message.textContent = 'Error: ' + error.message;
    }
}

/* Form submission handlers */
document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('reg_username').value;
    const password = document.getElementById('reg_password').value;
    const role = document.getElementById('reg_role').value;
    const message = document.getElementById('register-message');

    try {
        const response = await fetch('http://localhost:8000/api/v1/register/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, role })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Registration failed');
        }

        const data = await response.json();
        message.textContent = 'Registration successful! Please login.';
        message.style.color = 'green';
        showPage('login');
    } catch (error) {
        message.textContent = 'Error: ' + error.message;
        console.error('Registration error:', error);
    }
});

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const usernameInput = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const message = document.getElementById('login-message');
    try {
        const tokenResponse = await fetch('http://localhost:8000/api/token/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: usernameInput, password })
        });
        const tokenData = await tokenResponse.json();
        if (!tokenResponse.ok) {
            message.textContent = tokenData.detail || 'Login failed';
            return;
        }
        accessToken = tokenData.access;
        username = usernameInput;

        let role = 'Public';
        try {
            const profileResponse = await fetch('http://localhost:8000/api/v1/user-profile/', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            const profileData = await profileResponse.json();
            if (profileData.merchant_id) {
                role = 'Merchant';
            } else if (profileData.prs_id) {
                role = 'Public';
            }

            const roleResponse = await fetch('http://localhost:8000/api/v1/government-officials/', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            if (roleResponse.ok) {
                const roleData = await roleResponse.json();
                const official = roleData.find(o => o.username === usernameInput);
                if (official) {
                    role = official.role.charAt(0).toUpperCase() + official.role.slice(1);
                }
            }
        } catch (error) {
            console.error('Error fetching role:', error);
        }

        userRole = role;
        console.log('Assigned userRole:', userRole);
        document.getElementById('user-role').textContent = userRole;
        if (userRole === 'Government') {
            await fetchOfficialId(usernameInput);
        }
        message.textContent = 'Login successful!';
        message.style.color = 'green';
        showPage('welcome');
        toggleSidebarButtons();
    } catch (error) {
        message.textContent = 'Error: ' + error.message;
    }
});

document.getElementById('individual-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const prs_id = document.getElementById('ind_prs_id').value;
    const national_identifier = document.getElementById('ind_national_identifier').value;
    const date_of_birth = document.getElementById('ind_date_of_birth').value;
    const message = document.getElementById('individual-message');

    const data = {
        national_identifier,
        date_of_birth
    };

    const url = editingIndividualId ? 
        `http://localhost:8000/api/v1/individuals/${editingIndividualId}/` : 
        'http://localhost:8000/api/v1/individuals/';
    const method = editingIndividualId ? 'PATCH' : 'POST';

    try {
        console.log('Submitting individual:', { national_identifier, date_of_birth });
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify(data)
        });
        const result = await response.json();

        if (response.ok) {
            message.textContent = editingIndividualId ? 'Individual updated successfully!' : `Individual created: PRS ID ${result.prs_id}`;
            message.style.color = 'green';
            cancelIndividualUpdate();
            loadIndividuals();
            loadVaccinationPRSIDs();
            loadPurchasePRSIDs();
        } else {
            message.textContent = result.national_identifier || result.detail || (editingIndividualId ? 'Failed to update individual' : 'Failed to create individual');
        }
    } catch (error) {
        message.textContent = 'Error: ' + error.message;
    }
});

document.getElementById('merchant-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const business_license = document.getElementById('merch_business_license').value;
    const name = document.getElementById('merch_name').value;
    const address = document.getElementById('merch_address').value;
    const message = document.getElementById('merchant-message');

    const data = { business_license, name, address };

    const url = editingMerchantId ? 
        `http://localhost:8000/api/v1/merchants/${editingMerchantId}/` : 
        'http://localhost:8000/api/v1/merchants/';
    const method = editingMerchantId ? 'PATCH' : 'POST';

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify(data)
        });
        const result = await response.json();

        if (response.ok) {
            message.textContent = editingMerchantId ? 'Merchant updated successfully!' : `Merchant created: ID ${result.merchant_id}`;
            message.style.color = 'green';
            cancelMerchantUpdate();
            loadMerchants();
            loadStockMerchants();
            loadPurchaseMerchants();
        } else {
            message.textContent = result.business_license || result.detail || (editingMerchantId ? 'Failed to update merchant' : 'Failed to create merchant');
        }
    } catch (error) {
        message.textContent = 'Error: ' + error.message;
    }
});

document.getElementById('critical-item-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const item = {
        name: document.getElementById('item_name').value,
        purchase_limit: parseInt(document.getElementById('purchase_limit').value),
        limit_period: document.getElementById('limit_period').value,
        allowed_purchase_day: document.getElementById('allowed_day').value || null
    };
    
    if (item.purchase_limit <= 0) {
        document.getElementById('critical-item-message').textContent = 'Error: Purchase limit must be positive';
        return;
    }

    const message = document.getElementById('critical-item-message');
    const url = editingItemId ? 
        `http://localhost:8000/api/v1/critical-items/${editingItemId}/` : 
        'http://localhost:8000/api/v1/critical-items/';
    const method = editingItemId ? 'PATCH' : 'POST';

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(item)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `Failed to ${editingItemId ? 'update' : 'add'} item`);
        }
        
        message.textContent = editingItemId ? 'Item updated successfully!' : 'Item added successfully!';
        message.style.color = 'green';
        cancelUpdate();
        loadCriticalItems();
    } catch (error) {
        message.textContent = 'Error: ' + error.message;
    }
});

document.getElementById('merchant-stock-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const merchant = document.getElementById('stock_merchant').value;
    const item = document.getElementById('stock_item').value;
    const stock_level = document.getElementById('stock_level').value;
    const message = document.getElementById('merchant-stock-message');

    if (!merchant || isNaN(merchant) || merchant <= 0) {
        message.textContent = 'Error: Merchant ID must be a positive number';
        return;
    }
    if (!item || isNaN(item) || item <= 0) {
        message.textContent = 'Error: Item ID must be a positive number';
        return;
    }
    if (!stock_level || isNaN(stock_level) || stock_level < 0) {
        message.textContent = 'Error: Stock level must be a non-negative number';
        return;
    }

    const data = {
        merchant: parseInt(merchant),
        item: parseInt(item),
        stock_level: parseInt(stock_level)
    };

    const url = editingMerchantStockId ? 
        `http://localhost:8000/api/v1/merchant-stock/${editingMerchantStockId}/` : 
        'http://localhost:8000/api/v1/merchant-stock/';
    const method = editingMerchantStockId ? 'PATCH' : 'POST';

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `Failed to ${editingMerchantStockId ? 'update' : 'add'} stock`);
        }

        message.textContent = editingMerchantStockId ? 'Stock updated successfully!' : 'Stock added successfully!';
        message.style.color = 'green';
        cancelMerchantStockUpdate();
        loadMerchantStock();
    } catch (error) {
        message.textContent = 'Error: ' + error.message;
    }
});

document.getElementById('purchase-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const data = {
        prs_id: document.getElementById('purchase_prs_id').value,
        merchant: parseInt(document.getElementById('purchase_merchant').value),
        item: parseInt(document.getElementById('purchase_item').value),
        quantity: parseInt(document.getElementById('purchase_quantity').value)
    };

    if (userRole === 'Public') {
        if (!data.prs_id) {
            document.getElementById('purchase-message').textContent = 'Error: You must create an individual record first to get a PRS ID.';
            return;
        }
        if (!data.merchant) {
            document.getElementById('purchase-message').textContent = 'Error: You must specify a merchant to initiate a purchase.';
            return;
        }
        const userProfileResponse = await fetch('http://localhost:8000/api/v1/user-profile/', {
            headers: { 
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        const userProfile = await userProfileResponse.json();
        if (userProfile.prs_id !== data.prs_id) {
            document.getElementById('purchase-message').textContent = 'Error: You can only initiate purchases for your own PRS ID.';
            return;
        }
    }

    if (userRole === 'Merchant') {
        const userProfileResponse = await fetch('http://localhost:8000/api/v1/user-profile/', {
            headers: { 
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        const userProfile = await userProfileResponse.json();
        if (!userProfile.merchant_id || data.merchant !== userProfile.merchant_id) {
            document.getElementById('purchase-message').textContent = 'Error: You can only record purchases for your own merchant ID.';
            return;
        }
    }

    if (data.quantity <= 0) {
        document.getElementById('purchase-message').textContent = 'Error: Quantity must be positive';
        return;
    }

    const message = document.getElementById('purchase-message');
    const url = editingPurchaseId ? 
        `http://localhost:8000/api/v1/purchases/${editingPurchaseId}/` : 
        'http://localhost:8000/api/v1/purchases/';
    const method = editingPurchaseId ? 'PATCH' : 'POST';

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify(data)
        });
        const result = await response.json();

        if (response.ok) {
            message.textContent = editingPurchaseId ? 'Purchase updated successfully!' : 'Purchase recorded successfully!';
            message.style.color = 'green';
            cancelPurchaseUpdate();
            loadPurchases();
        } else {
            message.textContent = result.error || result.detail || (editingPurchaseId ? 'Failed to update purchase' : 'Failed to record purchase');
        }
    } catch (error) {
        message.textContent = 'Error: ' + error.message;
    }
});

document.getElementById('vaccination-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const data = {
        prs_id: document.getElementById('vacc_prs_id').value,
        vaccine_type: document.getElementById('vaccine_type').value,
        manufacturer: document.getElementById('manufacturer').value || null,
        dose_number: parseInt(document.getElementById('dose_number').value),
        batch_number: document.getElementById('batch_number').value || null,
        vaccination_date: document.getElementById('vaccination_date').value,
        administered_by: document.getElementById('administered_by').value || null,
        status: document.getElementById('status').value
    };

    if (data.dose_number <= 0) {
        document.getElementById('vaccination-message').textContent = 'Error: Dose number must be positive';
        return;
    }

    const message = document.getElementById('vaccination-message');
    const url = editingVaccinationId ? 
        `http://localhost:8000/api/v1/vaccination-records/${editingVaccinationId}/` : 
        'http://localhost:8000/api/v1/vaccination-records/upload/';
    const method = editingVaccinationId ? 'PATCH' : 'POST';

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify(data)
        });
        const result = await response.json();

        if (response.ok) {
            message.textContent = editingVaccinationId ? 'Vaccination record updated successfully!' : 'Vaccination record added successfully!';
            message.style.color = 'green';
            cancelVaccinationUpdate();
            loadVaccinationRecords();
        } else {
            message.textContent = result.error || result.detail || (editingVaccinationId ? 'Failed to update vaccination record' : 'Failed to add vaccination record');
        }
    } catch (error) {
        message.textContent = 'Error: ' + error.message;
    }
});