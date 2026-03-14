import Phaser from 'phaser';

export class MainLevel extends Phaser.Scene {
    constructor() {
        super({ key: 'MainLevel' });
    }

    create() {
        // A simple text object to prove the game engine is rendering to the screen!
        this.add.text(100, 100, 'BOR-MAGEDDON 1993: ENGINE ONLINE', { 
            fontSize: '48px', 
            color: '#ff0000',
            fontFamily: 'monospace'
        });
        
        console.log("Main Level Loaded Successfully!");
    }

    update() {
        // Game loop running
    }
}