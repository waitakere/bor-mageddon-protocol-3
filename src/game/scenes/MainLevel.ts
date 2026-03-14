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
        // 1. WORLD SETUP & WALKING BOUNDARIES
        // ==========================================
        // Restrict the Y-axis so characters can only walk on the pavement!
        this.physics.world.setBounds(0, 650, 4000, 430); 
        
        // ==========================================
        // 2. ALIGN BACKGROUNDS TO THE BOTTOM
        // ==========================================
        // setOrigin(0, 1) means "anchor this image by its bottom-left corner"
        this.add.image(0, 0, 'part1_sky').setOrigin(0, 0).setScrollFactor(0.1); 
        this.add.image(0, 1080, 'part1_mid').setOrigin(0, 1).setScrollFactor(0.4); 
        this.add.image(0, 1080, 'part1_floor').setOrigin(0, 1).setScrollFactor(1); 

        // ==========================================
        // 3. SPAWN PLAYER
        // ==========================================
        // Spawn Marko on the pavement
        this.player = new Marko(this, 200, 850);

        // ==========================================
        // 4. CAMERA SETUP
        // ==========================================
        // The camera can see the whole height, but physics keeps players low
        this.cameras.main.setBounds(0, 0, 4000, 1080);
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

        // ==========================================
        // 5. SPAWN ENEMIES
        // ==========================================
        this.enemies = this.physics.add.group();
        
        const mup1 = new MUP(this, 800, 850);
        const boss = new SlobodanCEO(this, 3500, 850); // Pushed way out to the right!
        
        this.enemies.addMultiple([mup1, boss]);

        // ==========================================
        // 6. HUD INITIALIZATION
        // ==========================================
        this.events.emit('update-health', this.player.health);
        this.events.emit('update-smf', this.player.smfMeter);
    }

    update(time: number, delta: number) {
        if (this.player && this.player.update) {
            // Provide basic keyboard inputs required by the Marko class
            const cursors = this.input.keyboard!.createCursorKeys();
            const punchKey = this.input.keyboard!.addKey('A');
            const kickKey = this.input.keyboard!.addKey('S');
            
            // Cast to 'any' to bypass Phaser's strict default update() signature
            (this.player as any).update({
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

        // 2.5D Depth Sorting (Characters lower on the screen overlap characters higher up)
        this.children.each((child: any) => {
            if (child.y && child.type !== 'Image') { 
                child.setDepth(child.y);
            }
        });
    }
}