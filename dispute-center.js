(() => {
    const input = document.getElementById("order-number-input");
    const openCaseBtn = document.getElementById("open-case-btn");
    const caseList = document.getElementById("case-list");
    const feedback = document.getElementById("dispute-feedback");
    const storageKey = "fc_dispute_cases";

    function getCases() {
        try {
            const data = JSON.parse(localStorage.getItem(storageKey) || "[]");
            return Array.isArray(data) ? data : [];
        } catch (error) {
            return [];
        }
    }

    function saveCases(cases) {
        localStorage.setItem(storageKey, JSON.stringify(cases.slice(0, 50)));
    }

    function renderCases() {
        const cases = getCases();

        if (cases.length === 0) {
            caseList.innerHTML = '<li class="case-empty">No cases opened yet.</li>';
            return;
        }

        caseList.innerHTML = cases.map((item) => {
            return `<li><span class="case-title">Case ${item.caseId} for Order ${item.orderNumber}</span><span class="case-meta">Status: ${item.status} | Opened: ${new Date(item.createdAt).toLocaleString()}</span></li>`;
        }).join("");
    }

    function createCase() {
        const orderNumber = input.value.trim();

        if (!orderNumber) {
            feedback.style.color = "#8c2f39";
            feedback.textContent = "Enter an order number to open a case.";
            return;
        }

        const cases = getCases();
        const duplicate = cases.find((item) => item.orderNumber.toLowerCase() === orderNumber.toLowerCase());

        if (duplicate) {
            feedback.style.color = "#8c2f39";
            feedback.textContent = `Case already exists for this order: ${duplicate.caseId}`;
            return;
        }

        const newCase = {
            caseId: `DC-${Date.now().toString().slice(-6)}`,
            orderNumber,
            status: "Open",
            createdAt: new Date().toISOString()
        };

        cases.unshift(newCase);
        saveCases(cases);
        renderCases();

        feedback.style.color = "#1f7a46";
        feedback.textContent = `Case opened successfully. Reference: ${newCase.caseId}`;
        input.value = "";
        input.focus();
    }

    openCaseBtn.addEventListener("click", createCase);
    input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            createCase();
        }
    });

    renderCases();
})();
