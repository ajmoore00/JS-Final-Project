"use strict";

class Card {
    constructor(rank, suit) {
        this.rank = rank;
        this.suit = suit;
    }
}

class GoFishGame {
    // --- AI memory and probability tracking ---
    resetAIMemory() {
        // For 2-player, track which ranks the player might have and how likely
        this.rankMemory = {};
        const ranks = [
            '2', '3', '4', '5', '6', '7', '8', '9', '10',
            'jack', 'queen', 'king', 'ace'
        ];
        for (let rank of ranks) {
            this.rankMemory[rank] = {
                denied: false,      // Player said "No" to this rank last time
                lastAsked: -1,      // Turn number when last asked
                countGiven: 0,      // How many times player gave this rank
                playerHas: null     // null=unknown, true=likely, false=unlikely
            };
        }
        this.turnCount = 0;
    }

    // Call this in constructor and when starting a new game
    constructor() {
        this.deck = [];
        this.playerCards = [];
        this.computerCards = [];
        this.books = { player: 0, computer: 0 };
        this.computerAskedBefore = [];
        this.computerNoList = [];
        this.isPlayerTurn = true;
        this.waitingForGoFish = false;
        this.lastAskedRank = null;
        this.setupDeck();
        this.resetAIMemory();
    }

    setupDeck() {
        // Make a new deck of cards
        const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
        const ranks = [
            '2', '3', '4', '5', '6', '7', '8', '9', '10',
            'jack', 'queen', 'king', 'ace'
        ];
        this.deck = [];
        for (let suit of suits) {
            for (let rank of ranks) {
                this.deck.push(new Card(rank, suit));
            }
        }
        this.shuffle();
        this.playerCards = [];
        this.computerCards = [];
        this.books = { player: 0, computer: 0 };
        this.computerAskedBefore = [];
        this.computerNoList = [];
        this.resetAIMemory();
    }

    shuffle() {
        // Shuffle the deck using Fisher-Yates
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    dealCards() {
        // Deal 7 cards to each player
        for (let i = 0; i < 7; i++) {
            this.playerCards.push(this.deck.pop());
            this.computerCards.push(this.deck.pop());
        }
    }

    draw(player) {
        // Draw a card from the deck for the given player
        if (this.deck.length === 0) return null;
        const card = this.deck.pop();
        (player === 'player' ? this.playerCards : this.computerCards).push(card);
        return card;
    }

    showHands() {
        // Show the player's cards
        const playerArea = document.querySelector('#player-hand .cards');
        playerArea.innerHTML = '';
        this.playerCards.forEach(card => {
            const cardDiv = document.createElement('div');
            cardDiv.className = 'card';
            cardDiv.style.backgroundImage = `url(images/${card.rank}_${card.suit}.png)`;
            cardDiv.style.backgroundSize = 'cover';
            cardDiv.dataset.rank = card.rank;
            // Only let you click if it's your turn and not waiting to go fish
            if (this.isPlayerTurn && !this.waitingForGoFish) {
                cardDiv.addEventListener('click', () => this.playerAsk(card));
                cardDiv.classList.remove('disabled');
            } else {
                cardDiv.classList.add('disabled');
            }
            playerArea.appendChild(cardDiv);
        });

        // Show the computer's cards as card backs
        const computerArea = document.querySelector('#computer-hand .cards');
        computerArea.innerHTML = '';
        this.computerCards.forEach(() => {
            const cardDiv = document.createElement('div');
            cardDiv.className = 'card';
            cardDiv.style.backgroundImage = 'url(images/cardback.png)';
            cardDiv.style.backgroundSize = 'cover';
            computerArea.appendChild(cardDiv);
        });

        // Update the books and deck count
        document.getElementById('player-books').textContent = this.books.player;
        document.getElementById('computer-books').textContent = this.books.computer;
        document.querySelector('#deck .cards-remaining').textContent = this.deck.length;
    }

    checkBooks(hand, who) {
        // Check if someone has 4 of the same rank (a "book")
        const count = {};
        hand.forEach(card => {
            count[card.rank] = (count[card.rank] || 0) + 1;
        });
        let gotBook = false;
        for (let rank in count) {
            if (count[rank] === 4) {
                // Remove all 4 cards of that rank from hand
                for (let i = hand.length - 1; i >= 0; i--) {
                    if (hand[i].rank === rank) hand.splice(i, 1);
                }
                this.books[who]++;
                gotBook = true;
            }
        }
        return gotBook;
    }

    playerAsk(card) {
        // Handles when the player clicks a card to ask for it
        if (!this.isPlayerTurn || this.waitingForGoFish) return;
        const msg = document.getElementById('message-area');
        if (!this.playerCards.some(c => c.rank === card.rank)) return;

        // Remember what the player has asked for
        if (!this.computerAskedBefore.includes(card.rank)) {
            this.computerAskedBefore.push(card.rank);
        }
        this.rankMemory[card.rank].playerHas = true;

        // Find all matches in computer's hand
        const matches = this.computerCards.filter(c => c.rank === card.rank);
        if (matches.length > 0) {
            // If computer has any, give them to player
            this.playerCards.push(...matches);
            this.computerCards = this.computerCards.filter(c => c.rank !== card.rank);
            msg.textContent = `You got ${matches.length} ${card.rank}${matches.length > 1 ? 's' : ''} from the computer! Go again.`;
            this.checkBooks(this.playerCards, 'player');
            this.showHands();

            // If you have no cards left after making a book, draw one if possible
            if (this.playerCards.length === 0) {
                if (this.deck.length > 0) {
                    // Instead of drawing automatically, force player to click deck
                    msg.textContent += " You have no cards, so you must draw. Click the deck to draw.";
                    this.waitingForGoFish = true;
                    this.isPlayerTurn = false; // End player's turn after forced draw
                    this.showHands();
                    return;
                } else {
                    msg.textContent += " You have no cards and the deck is empty. Computer's turn.";
                    this.isPlayerTurn = false;
                    setTimeout(() => this.computerTurn(), 1500);
                }
            }
            // Otherwise, player can keep going as normal
        } else {
            // If not, player has to go fish
            this.waitingForGoFish = true;
            this.lastAskedRank = card.rank;
            msg.textContent = `Go Fish! Click the deck to draw a card.`;
            this.showHands();
        }
        this.checkIfGameOver();
    }

    // --- AI chooses the best rank to ask for ---
    aiChooseRank() {
        // Count cards in computer's hand
        let handCounts = {};
        this.computerCards.forEach(card => {
            handCounts[card.rank] = (handCounts[card.rank] || 0) + 1;
        });

        // Count books (ranks that are already completed)
        let bookedRanks = [];
        for (let rank in this.rankMemory) {
            if (
                this.books.player + this.books.computer > 0 &&
                (this.books.player > 0 || this.books.computer > 0)
            ) {
                // If either player has a book for this rank, mark as booked
                if (
                    this.playerCards.filter(c => c.rank === rank).length === 0 &&
                    this.computerCards.filter(c => c.rank === rank).length === 0 &&
                    this.rankMemory[rank].denied &&
                    this.rankMemory[rank].playerHas === false
                ) {
                    bookedRanks.push(rank);
                }
            }
        }

        // Estimate probability for each rank in hand
        let rankProbs = {};
        const totalRanks = 13;
        const totalCards = 52;
        const knownPlayerCards = this.playerCards.length;
        const knownComputerCards = this.computerCards.length;
        const knownBooks = this.books.player + this.books.computer;

        for (let rank in handCounts) {
            if (handCounts[rank] === 4) continue; // Already have a book
            if (bookedRanks.includes(rank)) continue; // Already booked

            // Cards of this rank in computer's hand
            const inHand = handCounts[rank];
            // Cards of this rank in books (if you track which rank was booked, you could be more precise)
            // For now, just skip if handCounts[rank] === 4

            // Estimate: 4 - inHand = possible in player hand or deck
            let possible = 4 - inHand;
            // If you have memory that player has it, boost probability
            let prob = possible / (knownPlayerCards + this.deck.length);
            if (this.rankMemory[rank].playerHas === true) prob += 0.5;
            if (this.rankMemory[rank].denied) prob -= 0.3;
            rankProbs[rank] = prob;
        }

        // Pick the rank with the highest probability
        let bestRank = null;
        let bestProb = -Infinity;
        for (let rank in rankProbs) {
            if (rankProbs[rank] > bestProb) {
                bestProb = rankProbs[rank];
                bestRank = rank;
            }
        }

        // Fallback: original logic if all else fails
        if (!bestRank) {
            let candidates = Object.keys(handCounts).filter(rank => handCounts[rank] < 4);
            bestRank = candidates[0];
        }

        return bestRank;
    }

    // --- Update AI memory after each ask ---
    aiUpdateMemory(rank, result) {
        // result: "yes" or "no"
        this.rankMemory[rank].lastAsked = this.turnCount;
        if (result === "no") {
            this.rankMemory[rank].denied = true;
        } else {
            this.rankMemory[rank].denied = false;
            this.rankMemory[rank].countGiven += 1;
            // Track the last rank the computer got from the player
            this.lastPlayerGivenRank = rank;
            this.playerHasDrawnSinceGiven = false;
        }
    }

    // --- Update AI memory after player draws ---
    aiPlayerDrew(rank) {
        // If player drew after being asked for a rank, maybe they got it
        if (rank) {
            this.rankMemory[rank].denied = false;
        }
        // Mark that the player has drawn since last giving a card
        this.playerHasDrawnSinceGiven = true;
    }

    // --- Update AI memory after books ---
    aiBook(rank) {
        // If a book is made, no one has this rank anymore
        this.rankMemory[rank].denied = true;
        this.rankMemory[rank].playerHas = false;
    }

    // --- Replace the start of computerTurn() with this logic ---
    computerTurn() {
        // Handles the computer's turn
        this.isPlayerTurn = false;
        this.showHands();
        this.turnCount = (this.turnCount || 0) + 1;

        // --- If computer has no cards, draw one if possible ---
        if (this.computerCards.length === 0) {
            const msg = document.getElementById('message-area');
            if (this.deck.length > 0) {
                this.draw('computer');
                msg.textContent = "Computer had no cards and drew from the deck.";
                this.checkBooks(this.computerCards, 'computer');
                this.showHands();
                // End computer's turn after forced draw
                setTimeout(() => {
                    // If player has no cards and deck isn't empty, force player to draw
                    if (this.playerCards.length === 0 && this.deck.length > 0) {
                        msg.textContent = "You have no cards, so you must draw. Click the deck to draw.";
                        this.isPlayerTurn = true;
                        this.waitingForGoFish = true;
                        this.showHands();
                    } else {
                        this.isPlayerTurn = true;
                        this.showHands();
                        msg.textContent += " Your turn.";
                    }
                }, 1200);
                this.checkIfGameOver();
                return;
            } else {
                // Deck is empty
                if (this.playerCards.length === 0) {
                    // Both hands and deck are empty, so game is over
                    this.checkIfGameOver();
                    return;
                } else {
                    msg.textContent = "Computer has no cards and the deck is empty. Your turn.";
                    this.isPlayerTurn = true;
                    this.showHands();
                    // ADDITION: check again if player has no cards (covers edge case after computer books)
                    if (this.playerCards.length === 0 && this.deck.length === 0) {
                        this.checkIfGameOver();
                        return;
                    }
                }
            }
            this.checkIfGameOver();
            return;
        }

        // --- If player has no cards and deck isn't empty, force player to draw instead of asking ---
        if (this.playerCards.length === 0 && this.deck.length > 0) {
            const msg = document.getElementById('message-area');
            msg.textContent = "You have no cards, so you must draw. Click the deck to draw.";
            this.isPlayerTurn = true;
            this.waitingForGoFish = true;
            this.showHands();
            return;
        }

        const msg = document.getElementById('message-area');
        // AI chooses best rank to ask for
        let askRank = this.aiChooseRank();

        msg.textContent = `Computer: Do you have any ${askRank}s?`;

        // Show Yes/No buttons for player to answer
        const btnDiv = document.getElementById('response-buttons');
        const yesBtn = document.getElementById('yes-btn');
        const noBtn = document.getElementById('no-btn');
        btnDiv.style.display = 'block';

        // See if player has any of the asked rank
        const matches = this.playerCards.filter(card => card.rank === askRank);

        // Only enable the correct button
        yesBtn.disabled = matches.length === 0;
        noBtn.disabled = matches.length > 0;

        // Remove old listeners by cloning (avoids stacking up events)
        yesBtn.replaceWith(yesBtn.cloneNode(true));
        noBtn.replaceWith(noBtn.cloneNode(true));
        const newYesBtn = document.getElementById('yes-btn');
        const newNoBtn = document.getElementById('no-btn');

        // If player clicks Yes
        newYesBtn.onclick = () => {
            btnDiv.style.display = 'none';
            this.computerCards.push(...matches);
            this.playerCards = this.playerCards.filter(card => card.rank !== askRank);
            this.computerNoList.push(askRank);
            msg.textContent = `Computer got ${matches.length} ${askRank}${matches.length > 1 ? 's' : ''} from you! Computer goes again.`;
            this.aiUpdateMemory(askRank, "yes");
            this.checkBooks(this.computerCards, 'computer');
            this.showHands();

            this.checkIfGameOver();
            if (this.books.player + this.books.computer === 13 ||
                (this.playerCards.length === 0 && this.computerCards.length === 0 && this.deck.length === 0)) {
                return; // Stop further turns if game is over
            }

            // If computer has no cards left after making a book, draw one if possible
            if (this.computerCards.length === 0) {
                if (this.deck.length > 0) {
                    this.draw('computer');
                    msg.textContent += " Computer had no cards, so it draws from the deck.";
                    this.checkBooks(this.computerCards, 'computer');
                    this.showHands();
                    if (this.computerCards.length === 0) {
                        msg.textContent += " Computer still has no cards. Your turn.";
                        this.isPlayerTurn = true;
                        setTimeout(() => this.showHands(), 1000);
                        return;
                    }
                } else {
                    msg.textContent += " Computer has no cards and the deck is empty. Your turn.";
                    this.isPlayerTurn = true;
                    setTimeout(() => this.showHands(), 1000);
                    return;
                }
            }

            setTimeout(() => this.computerTurn(), 1500);
            this.checkIfGameOver();
        };

        // If player clicks No
        newNoBtn.onclick = () => {
            btnDiv.style.display = 'none';
            msg.textContent = "Computer goes fishing!";
            this.computerNoList.push(askRank);
            this.aiUpdateMemory(askRank, "no");
            const drawn = this.draw('computer');
            this.showHands();
            if (drawn && drawn.rank === askRank) {
                // If computer draws what it asked for, it goes again
                msg.textContent = `Computer drew the ${askRank}! Computer goes again.`;
                this.computerNoList = [];
                this.checkBooks(this.computerCards, 'computer');
                this.showHands();

                // If computer has no cards after making a book, draw one if possible
                if (this.computerCards.length === 0) {
                    if (this.deck.length > 0) {
                        this.draw('computer');
                        msg.textContent += " Computer had no cards, so it draws from the deck.";
                        this.checkBooks(this.computerCards, 'computer');
                        this.showHands();
                        if (this.computerCards.length === 0) {
                            msg.textContent += " Computer still has no cards. Your turn.";
                            this.isPlayerTurn = true;
                            setTimeout(() => this.showHands(), 1000);
                            return;
                        }
                    } else {
                        msg.textContent += " Computer has no cards and the deck is empty. Your turn.";
                        this.isPlayerTurn = true;
                        setTimeout(() => this.showHands(), 1000);
                        return;
                    }
                }

                setTimeout(() => this.computerTurn(), 1500);
            } else {
                // Otherwise, it's the player's turn
                this.checkBooks(this.computerCards, 'computer');
                this.showHands();
                this.isPlayerTurn = true;
                msg.textContent += " Your turn.";
                this.showHands();
            }
            this.checkIfGameOver();
        };
    }

    checkIfGameOver() {
        // Check if all books are made (13 total) or if both hands and deck are empty
        const msg = document.getElementById('message-area');
        const allBooks = this.books.player + this.books.computer === 13;
        const bothHandsEmpty = this.playerCards.length === 0 && this.computerCards.length === 0 && this.deck.length === 0;

        if (allBooks || bothHandsEmpty) {
            if (this.books.player > this.books.computer) {
                msg.textContent = "Game Over! You win!";
            } else if (this.books.computer > this.books.player) {
                msg.textContent = "Game Over! Computer wins!";
            } else {
                msg.textContent = "Game Over! It's a tie!";
            }
            // Disable further actions
            this.isPlayerTurn = false;
            this.waitingForGoFish = false;
            // Optionally, you could disable card clicks here if needed
        }
    }
}

// --- DOMContentLoaded ---
let game;
document.addEventListener('DOMContentLoaded', () => {
    game = new GoFishGame();
    game.dealCards();
    game.showHands();

    document.getElementById('deck').addEventListener('click', () => {
        const msg = document.getElementById('message-area');
        // Only let you draw if you're supposed to go fish
        if (game.waitingForGoFish) {
            const drawn = game.draw('player');
            if (drawn) {
                msg.textContent = `You drew the ${drawn.rank} of ${drawn.suit}.`;
            } else {
                msg.textContent = "Go Fish! The deck is empty.";
            }
            game.waitingForGoFish = false;
            game.checkBooks(game.playerCards, 'player');
            game.showHands();

            // AI memory: player has drawn since giving a card
            game.aiPlayerDrew(game.lastAskedRank);

            // If this was a forced draw because hand was empty, end turn after draw
            if (game.playerCards.length === 1 && game.isPlayerTurn === false) {
                msg.textContent += " Computer's turn.";
                setTimeout(() => game.computerTurn(), 1500);
                game.checkIfGameOver();
                return;
            }

            // If you have no cards after drawing (because you made a book), prompt to draw again if possible
            if (game.playerCards.length === 0 && game.deck.length > 0) {
                msg.textContent += " You have no cards, so you must draw again. Click the deck to draw.";
                game.waitingForGoFish = true;
            } else if (game.playerCards.length === 0 && game.deck.length === 0) {
                // Check for game over if both hands and deck are empty
                if (game.computerCards.length === 0) {
                    game.checkIfGameOver();
                } else {
                    msg.textContent += " You have no cards and the deck is empty. Computer's turn.";
                    game.isPlayerTurn = false;
                    setTimeout(() => game.computerTurn(), 1500);
                }
            } else if (drawn && drawn.rank === game.lastAskedRank) {
                // If you draw what you asked for, you go again
                msg.textContent += ` It's a ${game.lastAskedRank}! Go again.`;
                game.isPlayerTurn = true;
            } else if (!game.waitingForGoFish) {
                // Otherwise, computer's turn
                msg.textContent += " Computer's turn.";
                game.isPlayerTurn = false;
                setTimeout(() => game.computerTurn(), 1500);
            }
            game.lastAskedRank = null;
            game.checkIfGameOver();
        } else if (game.deck.length === 0) {
            msg.textContent = "No cards left in deck!";
        }
    });

    // Rules modal
    document.getElementById('rules-btn').addEventListener('click', () => {
        document.getElementById('rules-modal').style.display = 'block';
    });
    document.querySelector('.close').addEventListener('click', () => {
        document.getElementById('rules-modal').style.display = 'none';
    });
    window.addEventListener('click', (e) => {
        if (e.target === document.getElementById('rules-modal')) {
            document.getElementById('rules-modal').style.display = 'none';
        }
    });
    document.getElementById('new-game').addEventListener('click', () => {
        game = new GoFishGame();
        game.dealCards();
        game.showHands();
        document.getElementById('message-area').textContent = '';
    });
});
