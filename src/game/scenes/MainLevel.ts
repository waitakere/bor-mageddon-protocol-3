import Phaser from 'phaser';
import { Marko } from '../entities/Marko';
import { MUP } from '../entities/MUP';

export class MainLevel extends Phaser.Scene {
    public player!: any; 
    public enemies!: Phaser.Physics.Arcade.Group;
    public breakables!: Phaser.Physics.Arcade.Group;
    public items!: Phaser.Physics.Arcade.Group;
    public projectiles!: Phaser.Physics.Arcade.Group;
    private shadows!: Phaser.GameObjects.Graphics;
    
    private sectors: number[] = [800, 1600, 2400, 3200];
    private isLocked: boolean = false;
    private currentLockX: number = 0;
    private score: number = 0;

    constructor() {
        super({ key: 'MainLevel' });
    }

    create() {
        // Physics Setup
        this.physics.world.setBounds(0, 750, 4000, 330); 

        // Parallax
        this.add.image(0, 0, 'part1_sky').setOrigin(0, 0).setDisplaySize(4000, 1080).setScrollFactor(0.1);
        this.add.image(0, 1080, 'part1_mid').setOrigin(0, 1).setDisplaySize(4000, 650).setScrollFactor(0.4);
        this.add.image(0, 1080, 'part1_floor').setOrigin(0, 1).setDisplaySize(4000, 450).setScrollFactor(1);

        this.shadows = this.add.graphics().setAlpha(0.4);
        this.breakables = this.physics.add.group({ immovable: true });
        this.items = this.physics.add.group();
        this.enemies = this.physics.add.group();
        this.projectiles = this.physics.add.group();

        // CHARACTER SELECTION LOGIC
        const charKey = this.registry.get('selectedCharacter') || 'marko';
        console.log("Spawning character:", charKey);
        
        // Spawn the correct entity
        this.player = new Marko(this, 200, 950); 
        this.player.setScale(1.5);
        
        // Force physics body to never rotate
        if (this.player.body) {
            (this.player.body as Phaser.Physics.Arcade.Body).setAllowRotation(false);
        }

        // Enemies
        const mup1 = new MUP(this, 1000, 950);
        this.enemies.add(mup1);

        this.cameras.main.setBounds(0, 0, 4000, 1080);
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

        this.updateReactHUD();
    }

    update() {
        if (!this.player) return;

        this.handleCameraLock();

        // THE NUCLEAR ROTATION FIX
        // We iterate through every sprite with a body and FORCE angle to 0
        this.children.each((child: any) => {
            if (child.body) {
                child.setAngle(0);
                child.rotation = 0;
                if (child.body.angularVelocity) child.body.angularVelocity = 0;
            }
        });

        // Shadows
        this.shadows.clear().fillStyle(0x000000, 0.5);
        this.shadows.fillEllipse(this.player.x, this.player.y, 70, 20);
        this.enemies.getChildren().forEach((e: any) => { if (!e.isDead) this.shadows.fillEllipse(e.x, e.y, 70, 20); });

        // Input
        const cursors = this.input.keyboard!.createCursorKeys();
        const punchKey = this.input.keyboard!.addKey('A');
        const kickKey = this.input.keyboard!.addKey('S');

        this.player.update({
            up: cursors.up.isDown,
            down: cursors.down.isDown,
            left: cursors.left.isDown,
            right: cursors.right.isDown,
            punch: Phaser.Input.Keyboard.JustDown(punchKey),
            kicking: Phaser.Input.Keyboard.JustDown(kickKey)
        });

        this.enemies.getChildren().forEach((e: any) => { if (e.updateAI && !e.isDead) e.updateAI(this.player); });
        this.children.each((c: any) => { if (c.y && c.type !== 'Image' && c.type !== 'Graphics') c.setDepth(c.y); });
    }

    private handleCameraLock() {
        const cam = this.cameras.main;
        for (const lockPoint of this.sectors) {
            if (this.player.x > lockPoint && this.player.x < lockPoint + 50 && !this.isLocked) {
                const enemies = this.enemies.getChildren().filter((e: any) => !e.isDead && e.x < lockPoint + 1000);
                if (enemies.length > 0) {
                    this.isLocked = true;
                    this.currentLockX = lockPoint;
                    cam.stopFollow();
                    cam.setScroll(lockPoint - (cam.width / 2), 0);
                    this.physics.world.setBounds(lockPoint - (cam.width / 2), 750, cam.width, 330);
                    this.updateReactHUD();
                }
            }
        }
        if (this.isLocked) {
            const screenEnemies = this.enemies.getChildren().filter((e: any) => !e.isDead && Math.abs(e.x - this.currentLockX) < 600);
            if (screenEnemies.length === 0) {
                this.isLocked = false;
                cam.startFollow(this.player, true, 0.08, 0.08);
                this.physics.world.setBounds(0, 750, 4000, 330);
                this.updateReactHUD();
            }
        }
    }

    private updateReactHUD() {
        window.dispatchEvent(new CustomEvent('update-phaser-hud', {
            detail: { health: this.player?.health, score: this.score, showGo: !this.isLocked && this.player?.x < 3600 }
        }));
    }
}