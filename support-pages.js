(() => {
    const pageKey = document.body.getAttribute("data-page") || "customer-service";

    const pageCatalog = {
        "customer-service": {
            title: "Customer Service",
            description: "Track requests, find order help, and get direct support options.",
            topics: [
                ["Order Tracking", "Delivery", "Updates on shipping progress"],
                ["Returns and Refunds", "Policy", "Start return and refund status checks"],
                ["Payment Issues", "Billing", "Fix declined card or duplicate charges"],
                ["Account Help", "Access", "Recover account and profile settings"]
            ]
        },
        "faq": {
            title: "FAQ",
            description: "Browse quick answers to common shopping, payment, and account questions.",
            topics: [
                ["How long does shipping take?", "Delivery", "Most domestic orders arrive in 3-7 days"],
                ["Can I cancel an order?", "Orders", "Cancellation available before fulfillment"],
                ["Which cards are accepted?", "Payment", "Visa, Mastercard, and Amex accepted"],
                ["How do I apply discount code?", "Discount", "Enter code in checkout discount step"]
            ],
            faqs: [
                ["Where can I view my last order?", "Use the Recent Orders page linked from the store home page footer."],
                ["Can I change shipping address after payment?", "Yes, if the order is not packed yet. Contact support immediately."],
                ["Is account creation required?", "No, but creating an account makes tracking and faster checkout easier."],
                ["How do I use promo codes?", "At checkout, open Discount step and enter a valid code to apply savings."]
            ]
        },
        "dispute-center": {
            title: "Dispute Center",
            description: "Submit and monitor disputes for orders, deliveries, and payment concerns.",
            topics: [
                ["Delivery Not Received", "Shipping", "Report package marked delivered but missing"],
                ["Wrong Item", "Product", "File mismatch dispute with photo details"],
                ["Unauthorized Charge", "Billing", "Raise payment dispute with transaction ID"],
                ["Damaged Package", "Claims", "Request replacement or refund review"]
            ]
        },
        "corporate": {
            title: "Corporate",
            description: "Company overview, leadership updates, and business operations details.",
            topics: [
                ["Company Profile", "About", "Mission, values, and growth milestones"],
                ["Press Kit", "Media", "Brand assets and media contact details"],
                ["Investor Relations", "Finance", "Financial snapshots and investor contact"],
                ["Procurement", "Operations", "Vendor procurement submission guidelines"]
            ]
        },
        "careers": {
            title: "Careers",
            description: "Discover team openings, workplace benefits, and hiring timelines.",
            topics: [
                ["Open Positions", "Hiring", "Browse current technical and operations roles"],
                ["Internships", "Programs", "Apply for seasonal intern opportunities"],
                ["Hiring Process", "Recruiting", "Interview stages and expected timelines"],
                ["Benefits", "Culture", "Health, time off, and development programs"]
            ]
        },
        "partner": {
            title: "Partner",
            description: "Collaborate with BONDS MALL through logistics, co-marketing, or integrations.",
            topics: [
                ["Marketplace Partnership", "Sales", "Expand your catalog on our storefront"],
                ["Technology Integration", "API", "Connect inventory and fulfillment systems"],
                ["Logistics Collaboration", "Shipping", "Coordinate storage and delivery support"],
                ["Co-Marketing", "Growth", "Run collaborative campaigns and launches"]
            ]
        },
        "affiliate": {
            title: "Affiliate",
            description: "Join affiliate programs and earn commission through verified referrals.",
            topics: [
                ["Program Terms", "Policy", "Commission structure and payout schedule"],
                ["Referral Tracking", "Analytics", "Monitor clicks, orders, and conversions"],
                ["Promotional Assets", "Creative", "Ready-to-use banners and media kits"],
                ["Payout Questions", "Finance", "Resolve payout setup and tax form issues"]
            ]
        },
        "bonds-foundation": {
            title: "Bonds Foundation",
            description: "Community impact initiatives, grants, and volunteer opportunities.",
            topics: [
                ["Grant Applications", "Funding", "Submit applications for local projects"],
                ["Volunteer Events", "Community", "Join scheduled outreach programs"],
                ["Impact Reports", "Transparency", "Review annual outcomes and beneficiaries"],
                ["Donate", "Support", "Contribute to foundation causes and campaigns"]
            ]
        },
        "legal": {
            title: "Legal",
            description: "Review policy updates, compliance notices, and legal documentation.",
            topics: [
                ["Terms of Service", "Policy", "Platform usage terms and user obligations"],
                ["Privacy Policy", "Compliance", "How personal data is processed"],
                ["Cookie Notice", "Compliance", "Cookie usage and preference controls"],
                ["Intellectual Property", "Rights", "Trademark and copyright reporting"]
            ]
        }
    };

    const activePage = pageCatalog[pageKey] || pageCatalog["customer-service"];

    const titleEl = document.getElementById("page-title");
    const descriptionEl = document.getElementById("page-description");
    const listEl = document.getElementById("topic-list");
    const searchInput = document.getElementById("topic-search");
    const clearBtn = document.getElementById("clear-search");
    const faqPanel = document.getElementById("faq-panel");
    const faqList = document.getElementById("faq-list");
    const contactForm = document.getElementById("contact-form");
    const formFeedback = document.getElementById("form-feedback");

    titleEl.textContent = activePage.title;
    descriptionEl.textContent = activePage.description;

    function renderTopics(query) {
        const q = (query || "").trim().toLowerCase();
        const rows = activePage.topics.filter((topic) => {
            return topic.join(" ").toLowerCase().includes(q);
        });

        if (rows.length === 0) {
            listEl.innerHTML = "<li>No matching topics. Try another keyword.</li>";
            return;
        }

        listEl.innerHTML = rows.map((topic) => {
            return `<li><span class=\"topic-title\">${topic[0]}</span><span class=\"topic-meta\">${topic[1]} | ${topic[2]}</span></li>`;
        }).join("");
    }

    function renderFaq() {
        if (!Array.isArray(activePage.faqs) || activePage.faqs.length === 0) {
            faqPanel.classList.add("hidden");
            return;
        }

        faqPanel.classList.remove("hidden");
        faqList.innerHTML = activePage.faqs.map((item, index) => {
            return `<article class=\"faq-item\"><button class=\"faq-toggle\" type=\"button\" data-index=\"${index}\">${item[0]}</button><div class=\"faq-answer hidden\">${item[1]}</div></article>`;
        }).join("");

        faqList.querySelectorAll(".faq-toggle").forEach((button) => {
            button.addEventListener("click", () => {
                const answer = button.nextElementSibling;
                if (!answer) return;
                answer.classList.toggle("hidden");
            });
        });
    }

    searchInput.addEventListener("input", () => renderTopics(searchInput.value));
    clearBtn.addEventListener("click", () => {
        searchInput.value = "";
        renderTopics("");
        searchInput.focus();
    });

    contactForm.addEventListener("submit", (event) => {
        event.preventDefault();

        const name = document.getElementById("contact-name").value.trim();
        const email = document.getElementById("contact-email").value.trim();
        const issue = document.getElementById("contact-issue").value;
        const details = document.getElementById("contact-details").value.trim();

        if (!name || !email || !issue || details.length < 8) {
            formFeedback.textContent = "Please complete all fields with enough detail.";
            formFeedback.style.color = "#8c2f39";
            return;
        }

        const ticket = {
            page: pageKey,
            name,
            email,
            issue,
            details,
            reference: `FC-${Date.now().toString().slice(-6)}`,
            createdAt: new Date().toISOString()
        };

        const key = "fc_support_requests";
        const existing = JSON.parse(localStorage.getItem(key) || "[]");
        existing.unshift(ticket);
        localStorage.setItem(key, JSON.stringify(existing.slice(0, 40)));

        formFeedback.style.color = "#1f7a46";
        formFeedback.textContent = `Request saved. Reference: ${ticket.reference}`;
        contactForm.reset();
    });

    renderTopics("");
    renderFaq();
})();
