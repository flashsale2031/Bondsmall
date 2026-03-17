(() => {
    const bankForm = document.getElementById("bank-form");
    const cardForm = document.getElementById("card-form");
    const bankNameInput = document.getElementById("bank-name");
    const accountNumberInput = document.getElementById("account-number");
    const cardholderNameInput = document.getElementById("cardholder-name");
    const cardNumberInput = document.getElementById("card-number");
    const cardExpiryInput = document.getElementById("card-expiry");
    const listEl = document.getElementById("connected-accounts");
    const feedbackEl = document.getElementById("manage-feedback");

    const storageKey = "fc_linked_accounts";

    function loadAccounts() {
        try {
            const data = JSON.parse(localStorage.getItem(storageKey) || "[]");
            return Array.isArray(data) ? data : [];
        } catch (error) {
            return [];
        }
    }

    function saveAccounts(accounts) {
        localStorage.setItem(storageKey, JSON.stringify(accounts.slice(0, 50)));
    }

    function maskDigits(value, keep) {
        const digits = (value || "").replace(/\D/g, "");
        if (digits.length <= keep) {
            return digits;
        }
        return `${"*".repeat(digits.length - keep)}${digits.slice(-keep)}`;
    }

    function renderAccounts() {
        const accounts = loadAccounts();

        if (accounts.length === 0) {
            listEl.innerHTML = '<li class="empty-connected">You do not have any accounts connected.</li>';
            return;
        }

        listEl.innerHTML = accounts.map((item) => {
            if (item.type === "bank") {
                return `<li><span class="linked-title">Bank Account | ${item.bankName}</span><span class="linked-meta">Bank account ending ${item.accountEnding} | Linked ${new Date(item.createdAt).toLocaleDateString()}</span></li>`;
            }
            return `<li><span class="linked-title">Card | ${item.cardholder}</span><span class="linked-meta">Card ending ${item.cardEnding} | Exp ${item.expiry} | Linked ${new Date(item.createdAt).toLocaleDateString()}</span></li>`;
        }).join("");
    }

    function setFeedback(message, isError) {
        feedbackEl.textContent = message;
        feedbackEl.style.color = isError ? "#af2f3e" : "#1f7a46";
    }

    bankForm.addEventListener("submit", (event) => {
        event.preventDefault();

        const bankName = bankNameInput.value.trim();
        const accountNumber = accountNumberInput.value.trim();

        if (!bankName || accountNumber.replace(/\D/g, "").length < 6) {
            setFeedback("Enter a valid bank name and account number.", true);
            return;
        }

        const accounts = loadAccounts();
        accounts.unshift({
            type: "bank",
            bankName,
            accountEnding: maskDigits(accountNumber, 4).slice(-4),
            createdAt: new Date().toISOString()
        });
        saveAccounts(accounts);
        renderAccounts();
        bankForm.reset();
        setFeedback("Bank account linked successfully.", false);
    });

    cardForm.addEventListener("submit", (event) => {
        event.preventDefault();

        const cardholder = cardholderNameInput.value.trim();
        const cardNumber = cardNumberInput.value.trim();
        const expiry = cardExpiryInput.value;

        if (!cardholder || cardNumber.replace(/\D/g, "").length < 12 || !expiry) {
            setFeedback("Enter valid card details before linking.", true);
            return;
        }

        const accounts = loadAccounts();
        accounts.unshift({
            type: "card",
            cardholder,
            cardEnding: maskDigits(cardNumber, 4).slice(-4),
            expiry,
            createdAt: new Date().toISOString()
        });
        saveAccounts(accounts);
        renderAccounts();
        cardForm.reset();
        setFeedback("Card linked successfully.", false);
    });

    renderAccounts();
})();
