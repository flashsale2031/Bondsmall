(() => {
    function loadRewardsData() {
        // Get rewards from localStorage or use defaults
        const rewards = JSON.parse(localStorage.getItem("fc_rewards") || JSON.stringify({
            points: 2150,
            totalEarned: 5420,
            redeemed: 3270,
            tier: "Silver"
        }));

        document.getElementById('points-balance').textContent = rewards.points.toLocaleString();
        document.getElementById('total-earned').textContent = rewards.totalEarned.toLocaleString();
        document.getElementById('redeemed').textContent = rewards.redeemed.toLocaleString();
        document.getElementById('tier-level').textContent = rewards.tier;
    }

    window.addEventListener('DOMContentLoaded', loadRewardsData);
})();
