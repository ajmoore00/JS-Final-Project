// AI logic is separated for future difficulty levels and multiple AIs

export class GoFishAI {
    constructor(difficulty = "normal") {
        this.difficulty = difficulty; // "easy", "normal", "hard"
        this.resetMemory();
    }

    resetMemory() {
        this.rankMemory = {};
        const ranks = [
            '2', '3', '4', '5', '6', '7', '8', '9', '10',
            'jack', 'queen', 'king', 'ace'
        ];
        for (let rank of ranks) {
            this.rankMemory[rank] = {
                denied: false,
                lastAsked: -1,
                countGiven: 0
            };
        }
        this.turnCount = 0;
        this.computerAskedThisTurn = [];
        this.lastPlayerGivenRank = null;
        this.playerHasDrawnSinceGiven = false;
    }

    chooseRank(hand, playerCards, deck, books, alreadyAsked = []) {
        // This can be expanded for difficulty levels
        let handCounts = {};
        hand.forEach(card => {
            handCounts[card.rank] = (handCounts[card.rank] || 0) + 1;
        });

        let bookedRanks = [];
        for (let rank in this.rankMemory) {
            if (
                books.player + books.computer > 0 &&
                (books.player > 0 || books.computer > 0)
            ) {
                if (
                    playerCards.filter(c => c.rank === rank).length === 0 &&
                    hand.filter(c => c.rank === rank).length === 0 &&
                    this.rankMemory[rank].denied
                ) {
                    bookedRanks.push(rank);
                }
            }
        }

        let rankProbs = {};
        const knownPlayerCards = playerCards.length;

        for (let rank in handCounts) {
            if (handCounts[rank] === 4) continue;
            if (bookedRanks.includes(rank)) continue;

            let inHand = handCounts[rank];
            let possible = 4 - inHand;
            let prob = possible / (knownPlayerCards + deck.length);
            if (this.rankMemory[rank].denied) prob -= 0.3;
            rankProbs[rank] = prob;
        }

        for (let asked of alreadyAsked) {
            delete rankProbs[asked];
        }

        if (
            this.lastPlayerGivenRank &&
            handCounts[this.lastPlayerGivenRank] === 4 &&
            !this.playerHasDrawnSinceGiven
        ) {
            delete rankProbs[this.lastPlayerGivenRank];
        }

        let bestRank = null;
        let bestProb = -Infinity;
        for (let rank in rankProbs) {
            if (rankProbs[rank] > bestProb) {
                bestProb = rankProbs[rank];
                bestRank = rank;
            }
        }

        if (!bestRank) {
            let candidates = Object.keys(handCounts)
                .filter(rank => handCounts[rank] < 4 && !alreadyAsked.includes(rank));
            bestRank = candidates[0];
        }

        return bestRank;
    }

    updateMemory(rank, result) {
        this.rankMemory[rank].lastAsked = this.turnCount;
        if (result === "no") {
            this.rankMemory[rank].denied = true;
        } else {
            this.rankMemory[rank].denied = false;
            this.rankMemory[rank].countGiven += 1;
            this.lastPlayerGivenRank = rank;
            this.playerHasDrawnSinceGiven = false;
        }
    }

    playerDrew(rank) {
        if (rank) {
            this.rankMemory[rank].denied = false;
        }
        this.playerHasDrawnSinceGiven = true;
    }

    book(rank) {
        this.rankMemory[rank].denied = true;
    }
}