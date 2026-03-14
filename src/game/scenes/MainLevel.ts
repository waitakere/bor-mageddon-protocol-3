import Phaser from 'phaser';
import { Marko } from '../entities/Marko';
import { MUP } from '../entities/MUP';
import { SlobodanCEO } from '../entities/SlobodanCEO';

export class MainLevel extends Phaser.Scene {
    public player!: Marko;
    public enemies!: Phaser.Physics.Arcade.Group;
    public breakables!: Phaser.Physics.Arcade.Group;
    
    // Beat 'em up Lock System
    private currentLockX: number = 0;
    private isLocked: boolean = false;
    private sectors: number[] = [800, 1600, 2400, 3200]; // Points where the camera stops

    constructor() {
        super({ key: 'MainLevel' });
    }

    create() {
        // ==========================================
        // 1. WORLD SETUP & WALKING BOUNDARIES
        // ==========================================
        this.physics.world.setBounds(0, 650, 4000, 430); 
        
        // ==========================================
        // 2. ENVIRONMENT
        // ==========================================
        this.add.image(0, 0, 'part1_sky').setOrigin(0, 0).setScrollFactor(0.1); 
        this.add.image(0, 1080, 'part1_mid').setOrigin(0, 1).setScrollFactor(0.4); 
        this.add.image(0, 1080, 'part1_floor').setOrigin(0, 1).setScrollFactor(1); 

        // ==========================================
        // 3. BREAKABLE OBJECTS
        // ==========================================
        this.breakables = this.physics.add.group({ immovable: true });
        
        // Scatter some props along the level
        const propLocations = [
            { x: 500, y: 800, type: 'barrel' },
            { x: 1200, y: 750, type: 'crate' },
            { x: 1800, y: 900, type: 'kontejner' },
            { x: 2500, y: 820, type: 'barrel' }
        ];

        propLocations.forEach(loc => {
            const prop = this.physics.add.sprite(loc.x, loc.y, loc.type);
            prop.setOrigin(0.5, 1);
            this.breakables.add(prop);
        });

        // ==========================================
        // 4. SPAWN PLAYER
        // ==========================================
        this.player = new Marko(this, 200, 850);

        // ==========================================
        // 5. CAMERA SETUP
        // ==========================================
        this.cameras.main.setBounds(0, 0, 4000, 1080);
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

        // ==========================================
        // 6. SPAWN ENEMIES
        // ==========================================
        this.enemies = this.physics.add.group();
        
        // Initial Enemy wave
        const mup1 = new MUP(this, 700, 850);
        const mup2 = new MUP(this, 900, 750);
        const boss = new SlobodanCEO(this, 3800, 850);
        
        this.enemies.addMultiple([mup1, mup2, boss]);

        // ==========================================
        // 7. PHYSICS OVERLAP
        // ==========================================
        // Allow player to stand "behind" or "in front" of props
        this.physics.add.collider(this.player, this.breakables);
        this.physics.add.collider(this.enemies, this.breakables);

        this.events.emit('update-health', this.player.health);
    }

    update(time: number, delta: number) {
        if (!this.player) return;

        // --- CAMERA LOCK LOGIC ---
        this.handleCameraLock();

        // --- PLAYER INPUTS ---
        const cursors = this.input.keyboard!.createCursorKeys();
        const punchKey = this.input.keyboard!.addKey('A');
        const kickKey = this.input.keyboard!.addKey('S');
        
        (this.player as any).update({
            up: cursors.up.isDown,
            down: cursors.down.isDown,
            left: cursors.left.isDown,
            right: cursors.right.isDown,
            punch: punchKey.isDown,
            kicking: kickKey.isDown
        });

        // --- ENEMY AI ---
        this.enemies.getChildren().forEach((enemy: any) => {
            if (enemy.updateAI && !enemy.isDead) {
                enemy.updateAI(this.player); 
            }
        });

        // --- DEPTH SORTING ---
        this.children.each((child: any) => {
            if (child.y && child.type !== 'Image') { 
                child.setDepth(child.y);
            }
        });
    }

    private handleCameraLock() {
        const cam = this.cameras.main;
        const playerX = this.player.x;

        // 1. Check if we reached a sector boundary
        for (const lockPoint of this.sectors) {
            if (playerX > lockPoint && playerX < lockPoint + 50 && !this.isLocked) {
                // Check if any enemies are visible on screen
                const activeEnemies = this.enemies.getChildren().filter((e: any) => !e.isDead && e.x < lockPoint + 1000);
                
                if (activeEnemies.length > 0) {
                    this.isLocked = true;
                    this.currentLockX = lockPoint;
                    
                    // Stop the camera from following past this point
                    cam.stopFollow();
                    cam.setScroll(lockPoint - (cam.width / 2), 0);
                    
                    // Constrain player movement to the current screen
                    this.physics.world.setBounds(lockPoint - (cam.width / 2), 650, cam.width, 430);
                    
                    console.log("LEVEL LOCKED: ELIMINATE ALL ENEMIES");
                }
            }
        }

        // 2. Unlock if all local enemies are dead
        if (this.isLocked) {
            const screenEnemies = this.enemies.getChildren().filter((e: any) => 
                !e.isDead && e.x > (this.currentLockX - 500) && e.x < (this.currentLockX + 500)
            );

            if (screenEnemies.length === 0) {
                this.isLocked = false;
                cam.startFollow(this.player, true, 0.08, 0.08);
                // Reset world bounds to the full level
                this.physics.world.setBounds(0, 650, 4000, 430);
                console.log("LEVEL UNLOCKED: GO! ->");
            }
        }
    }
}