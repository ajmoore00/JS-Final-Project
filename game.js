"use strict";

import { Card } from './card.js';
import { GoFishAI } from './ai.js';

export class GoFishGame {
    constructor({ numPlayers = 2, numDecks = 1, aiDifficulty = "normal" } = {}) {
        this.numPlayers = numPlayers;
        this.numDecks = numDecks;
        this.ais = [];
        this.deck = [];
        this.players = [];
        this.books = [];
        this.isPlayerTurn = true;
        this.waitingForGoFish = false;
        this.lastAskedRank = null;

        // For now, only 1 human and 1 AI
        this.players = [
            { name: "player", hand: [] },
            { name: "computer", hand: [] }
        ];
        this.books = [0, 0];

        this.ai = new GoFishAI(aiDifficulty);

        this.setupDeck();
        this.dealCards();
    }

    setupDeck() {
        const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
        const ranks = [
            '2', '3', '4', '5', '6', '7', '8', '9', '10',
            'jack', 'queen', 'king', 'ace'
        ];
        this.deck = [];
        for (let d = 0; d < this.numDecks; d++) {
            for (let suit of suits) {
                for (let rank of ranks) {
                    this.deck.push(new Card(rank, suit));
                }
            }
        }
        this.shuffle();
        this.players.forEach(p => p.hand = []);
        this.books = this.players.map(() => 0);
        this.ai.resetMemory();
    }

    shuffle() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    dealCards() {
        const cardsPerPlayer = this.players.length > 3 ? 5 : 7;
        for (let i = 0; i < cardsPerPlayer; i++) {
            this.players.forEach(player => {
                if (this.deck.length > 0) player.hand.push(this.deck.pop());
            });
        }
    }

    draw(playerIdx) {
        if (this.deck.length === 0) return null;
        const card = this.deck.pop();
        this.players[playerIdx].hand.push(card);
        return card;
    }

    checkBooks(playerIdx) {
        const hand = this.players[playerIdx].hand;
        const count = {};
        hand.forEach(card => {
            count[card.rank] = (count[card.rank] || 0) + 1;
        });
        let gotBook = false;
        for (let rank in count) {
            if (count[rank] === 4) {
                for (let i = hand.length - 1; i >= 0; i--) {
                    if (hand[i].rank === rank) hand.splice(i, 1);
                }
                this.books[playerIdx]++;
                gotBook = true;
                if (playerIdx === 1) this.ai.book(rank);
            }
        }
        return gotBook;
    }

    // Add more game logic as needed for multiple AIs, decks, etc.
}
