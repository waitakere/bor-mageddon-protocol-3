import Phaser from 'phaser';

// Import Entities using your EXACT flat folder structure
import { Marko } from '../entities/Marko';
import { MUP } from '../entities/MUP';
import { SlobodanCEO } from '../entities/SlobodanCEO';

// If you have these systems built, uncomment them later!
// import { CollisionManager } from '../systems/CollisionManager';

export class MainLevel extends Phaser.Scene {
    public player!: Marko;
    public enemies!: Phaser.Physics.Arcade.Group;

    constructor() {
        super({ key: 'MainLevel' });
    }

    create() {
        // ==========================================
        // 1. WORLD SETUP
        // ==========================================
        this.physics.world.setBounds(0, 0, 2400, 1080); 
        
        // ==========================================
        // 2. SPAWN PLAYER
        // ==========================================
        // Using your actual Marko class that extends Player!
        this.player = new Marko(this, 200, 750);

        // ==========================================
        // 3. CAMERA SETUP
        // ==========================================
        this.cameras.main.setBounds(0, 0, 2400, 1080);
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

        // ==========================================
        // 4. SPAWN ENEMIES
        // ==========================================
        this.enemies = this.physics.add.group();
        
        const mup1 = new MUP(this, 800, 750);
        const boss = new SlobodanCEO(this, 1500, 750);
        
        this.enemies.addMultiple([mup1, boss]);

        // ==========================================
        // 5. HUD INITIALIZATION
        // ==========================================
        // Tells React to update the health bar and SMF meter to Marko's stats
        this.events.emit('update-health', this.player.health);
        this.events.emit('update-smf', this.player.smfMeter);
    }

    update() {
        // Update Player (Assuming your Player.ts handles its own input/update loop)
        if (this.player && this.player.update) {
            this.player.update();
        }

        // Update Enemies
        this.enemies.getChildren().forEach((enemy: any) => {
            if (enemy.updateAI && !enemy.isDead) {
                // Pass the player so the enemies know who to walk towards!
                enemy.updateAI(this.player); 
            }
        });

        // 2.5D Depth Sorting (Fake 3D perspective)
        this.children.each((child: any) => {
            if (child.y && child.type !== 'Image') { 
                child.setDepth(child.y);
            }
        });
    }
}