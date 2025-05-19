import { GoFishGame } from './game.js';

let game;

function renderHands() {
    // Player
    const playerArea = document.querySelector('#player-hand .cards');
    playerArea.innerHTML = '';
    game.players[0].hand.forEach(card => {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'card';
        cardDiv.style.backgroundImage = `url(images/${card.rank}_${card.suit}.png)`;
        cardDiv.style.backgroundSize = 'cover';
        cardDiv.dataset.rank = card.rank;
        if (game.isPlayerTurn && !game.waitingForGoFish) {
            cardDiv.addEventListener('click', () => playerAsk(card.rank));
            cardDiv.classList.remove('disabled');
        } else {
            cardDiv.classList.add('disabled');
        }
        playerArea.appendChild(cardDiv);
    });

    // Computer (show backs)
    const computerArea = document.querySelector('#computer-hand .cards');
    computerArea.innerHTML = '';
    game.players[1].hand.forEach(() => {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'card';
        cardDiv.style.backgroundImage = 'url(images/cardback.png)';
        cardDiv.style.backgroundSize = 'cover';
        computerArea.appendChild(cardDiv);
    });

    document.getElementById('player-books').textContent = game.books[0];
    document.getElementById('computer-books').textContent = game.books[1];
    document.querySelector('#deck .cards-remaining').textContent = game.deck.length;
}

function playerAsk(rank) {
    if (!game.isPlayerTurn || game.waitingForGoFish) return;
    const msg = document.getElementById('message-area');
    if (!game.players[0].hand.some(c => c.rank === rank)) return;

    const matches = game.players[1].hand.filter(c => c.rank === rank);
    if (matches.length > 0) {
        game.players[0].hand.push(...matches);
        game.players[1].hand = game.players[1].hand.filter(c => c.rank !== rank);
        msg.textContent = `You got ${matches.length} ${rank}${matches.length > 1 ? 's' : ''} from the computer! Go again.`;
        game.checkBooks(0);
        renderHands();
        if (game.players[0].hand.length === 0) {
            if (game.deck.length > 0) {
                msg.textContent += " You have no cards, so you must draw. Click the deck to draw.";
                game.waitingForGoFish = true;
                game.isPlayerTurn = false;
                renderHands();
                return;
            } else {
                msg.textContent += " You have no cards and the deck is empty. Computer's turn.";
                game.isPlayerTurn = false;
                setTimeout(computerTurn, 1500);
            }
        }
    } else {
        game.waitingForGoFish = true;
        game.lastAskedRank = rank;
        msg.textContent = `Go Fish! Click the deck to draw a card.`;
        renderHands();
    }
    checkIfGameOver();
}

function computerTurn() {
    game.isPlayerTurn = false;
    renderHands();
    game.ai.turnCount++;
    game.ai.computerAskedThisTurn = [];

    if (game.players[1].hand.length === 0) {
        const msg = document.getElementById('message-area');
        if (game.deck.length > 0) {
            game.draw(1);
            msg.textContent = "Computer had no cards and drew from the deck.";
            game.checkBooks(1);
            renderHands();
            setTimeout(() => {
                if (game.players[0].hand.length === 0 && game.deck.length > 0) {
                    msg.textContent = "You have no cards, so you must draw. Click the deck to draw.";
                    game.isPlayerTurn = true;
                    game.waitingForGoFish = true;
                    renderHands();
                } else {
                    game.isPlayerTurn = true;
                    renderHands();
                    msg.textContent += " Your turn.";
                }
            }, 1200);
            checkIfGameOver();
            return;
        } else {
            if (game.players[0].hand.length === 0) {
                checkIfGameOver();
                return;
            } else {
                msg.textContent = "Computer has no cards and the deck is empty. Your turn.";
                game.isPlayerTurn = true;
                renderHands();
                if (game.players[0].hand.length === 0 && game.deck.length === 0) {
                    checkIfGameOver();
                    return;
                }
            }
        }
        checkIfGameOver();
        return;
    }

    if (game.players[0].hand.length === 0 && game.deck.length > 0) {
        const msg = document.getElementById('message-area');
        msg.textContent = "You have no cards, so you must draw. Click the deck to draw.";
        game.isPlayerTurn = true;
        game.waitingForGoFish = true;
        renderHands();
        return;
    }

    const msg = document.getElementById('message-area');
    let askRank = game.ai.chooseRank(
        game.players[1].hand,
        game.players[0].hand,
        game.deck,
        { player: game.books[0], computer: game.books[1] },
        game.ai.computerAskedThisTurn
    );
    game.ai.computerAskedThisTurn.push(askRank);

    msg.textContent = `Computer: Do you have any ${askRank}s?`;

    const btnDiv = document.getElementById('response-buttons');
    const yesBtn = document.getElementById('yes-btn');
    const noBtn = document.getElementById('no-btn');
    btnDiv.style.display = 'block';

    const matches = game.players[0].hand.filter(card => card.rank === askRank);

    yesBtn.disabled = matches.length === 0;
    noBtn.disabled = matches.length > 0;

    yesBtn.replaceWith(yesBtn.cloneNode(true));
    noBtn.replaceWith(noBtn.cloneNode(true));
    const newYesBtn = document.getElementById('yes-btn');
    const newNoBtn = document.getElementById('no-btn');

    newYesBtn.onclick = () => {
        btnDiv.style.display = 'none';
        game.players[1].hand.push(...matches);
        game.players[0].hand = game.players[0].hand.filter(card => card.rank !== askRank);
        msg.textContent = `Computer got ${matches.length} ${askRank}${matches.length > 1 ? 's' : ''} from you! Computer goes again.`;
        game.ai.updateMemory(askRank, "yes");
        game.checkBooks(1);
        renderHands();

        checkIfGameOver();
        if (game.books[0] + game.books[1] === 13 ||
            (game.players[0].hand.length === 0 && game.players[1].hand.length === 0 && game.deck.length === 0)) {
            return;
        }

        if (game.players[1].hand.length === 0) {
            if (game.deck.length > 0) {
                game.draw(1);
                msg.textContent += " Computer had no cards, so it draws from the deck.";
                game.checkBooks(1);
                renderHands();
                if (game.players[1].hand.length === 0) {
                    msg.textContent += " Computer still has no cards. Your turn.";
                    game.isPlayerTurn = true;
                    setTimeout(renderHands, 1000);
                    return;
                }
            } else {
                msg.textContent += " Computer has no cards and the deck is empty. Your turn.";
                game.isPlayerTurn = true;
                setTimeout(renderHands, 1000);
                return;
            }
        }

        setTimeout(computerTurn, 1500);
        checkIfGameOver();
    };

    newNoBtn.onclick = () => {
        btnDiv.style.display = 'none';
        msg.textContent = "Computer goes fishing!";
        game.ai.updateMemory(askRank, "no");
        const drawn = game.draw(1);
        renderHands();
        if (drawn && drawn.rank === askRank) {
            msg.textContent = `Computer drew the ${askRank}! Computer goes again.`;
            game.checkBooks(1);
            renderHands();

            if (game.players[1].hand.length === 0) {
                if (game.deck.length > 0) {
                    game.draw(1);
                    msg.textContent += " Computer had no cards, so it draws from the deck.";
                    game.checkBooks(1);
                    renderHands();
                    if (game.players[1].hand.length === 0) {
                        msg.textContent += " Computer still has no cards. Your turn.";
                        game.isPlayerTurn = true;
                        setTimeout(renderHands, 1000);
                        return;
                    }
                } else {
                    msg.textContent += " Computer has no cards and the deck is empty. Your turn.";
                    game.isPlayerTurn = true;
                    setTimeout(renderHands, 1000);
                    return;
                }
            }

            setTimeout(computerTurn, 1500);
        } else {
            game.checkBooks(1);
            renderHands();
            game.isPlayerTurn = true;
            msg.textContent += " Your turn.";
            renderHands();
        }
        checkIfGameOver();
    };
}

function checkIfGameOver() {
    const msg = document.getElementById('message-area');
    const allBooks = game.books[0] + game.books[1] === 13;
    const bothHandsEmpty = game.players[0].hand.length === 0 && game.players[1].hand.length === 0 && game.deck.length === 0;

    if (allBooks || bothHandsEmpty) {
        if (game.books[0] > game.books[1]) {
            msg.textContent = "Game Over! You win!";
        } else if (game.books[1] > game.books[0]) {
            msg.textContent = "Game Over! Computer wins!";
        } else {
            msg.textContent = "Game Over! It's a tie!";
        }
        game.isPlayerTurn = false;
        game.waitingForGoFish = false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    game = new GoFishGame();
    renderHands();

    document.getElementById('deck').addEventListener('click', () => {
        const msg = document.getElementById('message-area');
        if (game.waitingForGoFish) {
            const drawn = game.draw(0);
            if (drawn) {
                msg.textContent = `You drew the ${drawn.rank} of ${drawn.suit}.`;
            } else {
                msg.textContent = "Go Fish! The deck is empty.";
            }
            game.waitingForGoFish = false;
            game.checkBooks(0);
            renderHands();

            game.ai.playerDrew(game.lastAskedRank);

            if (game.players[0].hand.length === 1 && game.isPlayerTurn === false) {
                msg.textContent += " Computer's turn.";
                setTimeout(computerTurn, 1500);
                checkIfGameOver();
                return;
            }

            if (game.players[0].hand.length === 0 && game.deck.length > 0) {
                msg.textContent += " You have no cards, so you must draw again. Click the deck to draw.";
                game.waitingForGoFish = true;
            } else if (game.players[0].hand.length === 0 && game.deck.length === 0) {
                if (game.players[1].hand.length === 0) {
                    checkIfGameOver();
                } else {
                    msg.textContent += " You have no cards and the deck is empty. Computer's turn.";
                    game.isPlayerTurn = false;
                    setTimeout(computerTurn, 1500);
                }
            } else if (drawn && drawn.rank === game.lastAskedRank) {
                msg.textContent += ` It's a ${game.lastAskedRank}! Go again.`;
                game.isPlayerTurn = true;
            } else if (!game.waitingForGoFish) {
                msg.textContent += " Computer's turn.";
                game.isPlayerTurn = false;
                setTimeout(computerTurn, 1500);
            }
            game.lastAskedRank = null;
            checkIfGameOver();
        } else if (game.deck.length === 0) {
            msg.textContent = "No cards left in deck!";
        }
    });

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
        renderHands();
        document.getElementById('message-area').textContent = '';
    });
});