import Phaser from 'phaser';
import { Marko } from '../entities/Marko';
import { Maja } from '../entities/Maja';
import { Darko } from '../entities/Darko';
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
    public score: number = 0; // Exposed for enemy scripts to update

    constructor() {
        super({ key: 'MainLevel' });
    }

    create() {
        // Set physics bounds (ground plane)
        this.physics.world.setBounds(0, 750, 4000, 330); 

        this.add.image(0, 0, 'part1_sky').setOrigin(0, 0).setDisplaySize(4000, 1080).setScrollFactor(0.1);
        this.add.image(0, 1080, 'part1_mid').setOrigin(0, 1).setDisplaySize(4000, 650).setScrollFactor(0.4);
        this.add.image(0, 1080, 'part1_floor').setOrigin(0, 1).setDisplaySize(4000, 450).setScrollFactor(1);

        this.shadows = this.add.graphics().setAlpha(0.4);
        this.breakables = this.physics.add.group({ immovable: true });
        this.items = this.physics.add.group();
        this.enemies = this.physics.add.group();
        this.projectiles = this.physics.add.group();

        const charKey = this.registry.get('selectedCharacter') || 'marko';
        switch(charKey) {
            case 'maja': this.player = new Maja(this, 200, 950); break;
            case 'darko': this.player = new Darko(this, 200, 950); break;
            default: this.player = new Marko(this, 200, 950); break;
        }

        // RESET SCALE: Characters are naturally high-res
        this.player.setScale(1);

        // Spawn Enemy (MUP will scale itself up in its own class)
        this.enemies.add(new MUP(this, 1000, 950));

        this.cameras.main.setBounds(0, 0, 4000, 1080);
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

        this.updateReactHUD();
    }

    update() {
        if (!this.player || this.player.isDead) return;

        this.handleCameraLock();

        // Lock rotation globally to prevent physics spinning
        this.children.each((child: any) => {
            if (child.body && child.type === 'Sprite') {
                child.setAngle(0);
                child.rotation = 0;
            }
        });

        // Update Shadows
        this.shadows.clear().fillStyle(0x000000, 0.5);
        this.shadows.fillEllipse(this.player.x, this.player.y, 70, 20);
        this.enemies.getChildren().forEach((e: any) => { 
            if (!e.isDead) this.shadows.fillEllipse(e.x, e.y, 70, 20); 
        });

        // Input Mapping (Includes SPACE for jump)
        const cursors = this.input.keyboard!.createCursorKeys();
        const keys = {
            up: cursors.up.isDown,
            down: cursors.down.isDown,
            left: cursors.left.isDown,
            right: cursors.right.isDown,
            space: Phaser.Input.Keyboard.JustDown(this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)),
            punch: Phaser.Input.Keyboard.JustDown(this.input.keyboard!.addKey('A')),
            kicking: Phaser.Input.Keyboard.JustDown(this.input.keyboard!.addKey('S')),
            special: Phaser.Input.Keyboard.JustDown(this.input.keyboard!.addKey('Q')),
            finisher: Phaser.Input.Keyboard.JustDown(this.input.keyboard!.addKey('E'))
        };

        this.player.update(keys);

        // Enemy AI & Depth Sorting
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
                    this.physics.world.setBounds(lockPoint - (cam.width / 2), 750, cam.width, 330);
                    this.updateReactHUD();
                }
            }
        }
        if (this.isLocked && this.enemies.getChildren().filter((e: any) => !e.isDead && Math.abs(e.x - this.currentLockX) < 600).length === 0) {
            this.isLocked = false;
            cam.startFollow(this.player, true, 0.08, 0.08);
            this.physics.world.setBounds(0, 750, 4000, 330);
            this.updateReactHUD();
        }
    }

    public updateReactHUD() {
        window.dispatchEvent(new CustomEvent('update-phaser-hud', {
            detail: { 
                health: this.player?.health, 
                smf: this.player?.smfMeter,
                score: this.score, 
                showGo: !this.isLocked && this.player?.x < 3600 
            }
        }));
    }
}