import Phaser from 'phaser';
import { Marko } from '../entities/Marko';
import { MUP } from '../entities/MUP';
import { SlobodanCEO } from '../entities/SlobodanCEO';

export class MainLevel extends Phaser.Scene {
    public player!: Marko;
    public enemies!: Phaser.Physics.Arcade.Group;

    constructor() {
        super({ key: 'MainLevel' });
    }

    create() {
        // ==========================================
        // 1. WORLD SETUP & ENVIRONMENT
        // ==========================================
        this.physics.world.setBounds(0, 0, 4000, 1080); 
        
        // Add the parallax layers from back to front
        this.add.image(0, 0, 'part1_sky').setOrigin(0, 0).setScrollFactor(0.2);
        this.add.image(0, 0, 'part1_mid').setOrigin(0, 0).setScrollFactor(0.5);
        this.add.image(0, 0, 'part1_floor').setOrigin(0, 0).setScrollFactor(1);

        // ==========================================
        // 2. SPAWN PLAYER
        // ==========================================
        this.player = new Marko(this, 200, 750);

        // ==========================================
        // 3. CAMERA SETUP
        // ==========================================
        this.cameras.main.setBounds(0, 0, 4000, 1080);
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

        // ==========================================
        // 4. SPAWN ENEMIES
        // ==========================================
        this.enemies = this.physics.add.group();
        
        const mup1 = new MUP(this, 800, 750);
        const boss = new SlobodanCEO(this, 3500, 750); // Moved to the end of the level
        
        this.enemies.addMultiple([mup1, boss]);

        // ==========================================
        // 5. HUD INITIALIZATION
        // ==========================================
        this.events.emit('update-health', this.player.health);
        this.events.emit('update-smf', this.player.smfMeter);
    }

    update() {
        if (this.player && this.player.update) {
            // Provide basic keyboard inputs required by the Marko class
            const cursors = this.input.keyboard!.createCursorKeys();
            const punchKey = this.input.keyboard!.addKey('A');
            const kickKey = this.input.keyboard!.addKey('S');
            
            this.player.update({
                up: cursors.up.isDown,
                down: cursors.down.isDown,
                left: cursors.left.isDown,
                right: cursors.right.isDown,
                punch: punchKey.isDown,
                kicking: kickKey.isDown
            });
        }

        this.enemies.getChildren().forEach((enemy: any) => {
            if (enemy.updateAI && !enemy.isDead) {
                enemy.updateAI(this.player); 
            }
        });

        // 2.5D Depth Sorting
        this.children.each((child: any) => {
            if (child.y && child.type !== 'Image') { 
                child.setDepth(child.y);
            }
        });
    }
}