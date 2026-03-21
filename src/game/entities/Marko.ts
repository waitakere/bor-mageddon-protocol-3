import Phaser from 'phaser';

export class Marko extends Phaser.Physics.Arcade.Sprite {
    public health: number = 100;
    public maxHealth: number = 100;
    public smfMeter: number = 0;
    public characterName: string = 'marko';
    public damageMultiplier: number = 1.0;
    public isAttacking: boolean = false;
    public isDead: boolean = false;
    public isJumping: boolean = false;
    
    private currentVoice: any = null;

    private walkSpeed: number = 200;
    private runSpeed: number = 380;
    private lastKey: string = '';
    private lastKeyTime: number = 0;
    private isRunning: boolean = false;
    private queuedAction: string | null = null;

    private punchImpacts = ['punch_1', 'punch_2', 'punch_3', 'punch_4', 'punch_5', 'punch_6', 'punch_7', 'punch_8'];
    private kickImpacts = ['kick_1', 'kick_2', 'kick_3', 'kick_4'];

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'marko', 'marko-idle/frame_000.png');
        scene.add.existing(this); 
        scene.physics.add.existing(this);
        
        this.setOrigin(0.5, 1);
        this.setScale(1.7); 

        if (this.body) {
            this.body.setSize(80, 30); 
            this.body.setOffset(this.width / 2 - 40, this.height - 30);
            (this.body as Phaser.Physics.Arcade.Body).setAllowRotation(false);
        }

        // Initialize all animations dynamically from the loaded JSON atlas
        this.createAnimations();
    }

    /**
     * Builds all of Marko's animations using the precise frame names from marko.json
     */
    private createAnimations() {
        const anims = this.scene.anims;
        
        // If the idle animation already exists, we don't need to rebuild them
        if (anims.exists(`${this.characterName}-idle`)) return;

        const createAnim = (key: string, start: number, end: number, frameRate: number, repeat: number = 0) => {
            anims.create({
                key: key,
                frames: anims.generateFrameNames('marko', {
                    prefix: `${key}/frame_`,
                    suffix: '.png',
                    start: start,
                    end: end,
                    zeroPad: 3 // Matches the 000, 001 format in your JSON
                }),
                frameRate: frameRate,
                repeat: repeat
            });
        };

        // Core Movement
        createAnim('marko-idle', 0, 8, 10, -1);
        createAnim('marko-walk', 0, 16, 15, -1);
        createAnim('marko-run', 0, 16, 20, -1);
        createAnim('marko-jump', 0, 8, 12, 0);
        
        // Standard Attacks
        createAnim('marko-punch-1', 0, 3, 12, 0);
        createAnim('marko-punch-2', 0, 8, 15, 0);
        createAnim('marko-kick-1', 0, 7, 15, 0);
        createAnim('marko-kick-2', 0, 2, 10, 0);
        createAnim('marko-melee', 0, 24, 15, 0);
        
        // Aerial Attacks
        createAnim('marko-jump-punch', 0, 0, 10, 0);
        createAnim('marko-jump-kick', 0, 0, 10, 0);
        
        // Specials & Finishers
        createAnim('marko-special-attack', 0, 15, 15, 0);
        createAnim('marko-finish-move', 0, 35, 15, 0);
        createAnim('marko-throw', 0, 26, 15, 0);
        
        // Reactions & Environment (Note: damage starts at frame_001 in your JSON)
        createAnim('marko-damage', 1, 7, 15, 0); 
        createAnim('marko-knockdown-get-up', 0, 35, 15, 0);
        createAnim('marko-dying', 0, 36, 12, 0);
        createAnim('marko-pick-up', 0, 3, 10, 0);
        
        // Static Poses
        createAnim('marko-shoot', 0, 0, 10, 0);
        createAnim('marko-shoot-recoil', 0, 0, 10, 0);
        createAnim('marko-shoot-up', 0, 0, 10, 0);
    }

    private playVoice(marker: string | string[]) {
        if (this.currentVoice && this.currentVoice.isPlaying) this.currentVoice.stop();
        this.currentVoice = (this.scene as any).playSFX(marker);
    }

    public playPickupAnim() {
        if (this.isDead || this.isJumping || this.isAttacking) return;
        
        this.isAttacking = true;
        this.setVelocity(0, 0);

        const animKey = `${this.characterName}-pick-up`;
        
        if (this.scene.anims.exists(animKey)) {
            this.play(animKey, true);
            this.once('animationcomplete', () => {
                this.isAttacking = false;
            });
        } else {
            this.play(`${this.characterName}-idle`, true);
            this.scene.time.delayedCall(300, () => {
                this.isAttacking = false;
            });
        }
    }

    public update(input: any) {
        if (this.isDead) return;
        this.setAngle(0);

        if (input.space && !this.isJumping && !this.isAttacking) {
            this.isJumping = true;
            this.playVoice(['grunt_m_1', 'grunt_m_2']); 
            this.scene.tweens.add({ targets: this, displayOriginY: this.height + 150, duration: 350, yoyo: true, ease: 'Sine.easeInOut', onComplete: () => { this.isJumping = false; this.displayOriginY = this.height; }});
        }

        const now = this.scene.time.now;
        if (input.left || input.right) {
            const dir = input.left ? 'left' : 'right';
            if (this.lastKey !== dir) { if (now - this.lastKeyTime < 250) this.isRunning = true; this.lastKey = dir; this.lastKeyTime = now; }
        } else { this.isRunning = false; this.lastKey = ''; }

        let requestedAction: string | null = null;
        if (input.special) requestedAction = 'special';
        else if (input.finisher) requestedAction = 'finisher';
        else if (input.p1) requestedAction = 'punch-1';
        else if (input.p2) requestedAction = 'punch-2';
        else if (input.k1) requestedAction = 'kick-1';
        else if (input.k2) requestedAction = 'kick-2';

        if (requestedAction) {
            if (this.isJumping && !this.isAttacking) {
                if (requestedAction.includes('punch') || requestedAction.includes('kick')) {
                    this.executeJumpAttack(requestedAction);
                }
            } else if (!this.isJumping && !this.isAttacking) {
                this.executeAction(requestedAction);
            } else {
                this.queuedAction = requestedAction;
            }
            return; 
        }

        if (!this.isAttacking) {
            const speed = this.isRunning ? this.runSpeed : this.walkSpeed;
            let vx = input.left ? -speed : (input.right ? speed : 0);
            let vy = 0;
            if (!this.isJumping) vy = input.up ? -speed * 0.6 : (input.down ? speed * 0.6 : 0);
            this.setVelocity(vx, vy);
            if (vx !== 0) this.setFlipX(vx < 0);
            if (vx !== 0 || vy !== 0) {
                const anim = this.isRunning ? `${this.characterName}-run` : `${this.characterName}-walk`;
                this.play(this.scene.anims.exists(anim) ? anim : `${this.characterName}-walk`, true);
            } else { if (!this.isJumping) this.play(`${this.characterName}-idle`, true); }
        }
    }

    private executeJumpAttack(action: string) {
        this.isAttacking = true;
        const type = action.includes('punch') ? 'jump-punch' : 'jump-kick';
        const animToPlay = `${this.characterName}-${type}`;
        
        if (this.scene.anims.exists(animToPlay)) this.play(animToPlay, true);
        else this.play(`${this.characterName}-kick-1`, true); 
        
        this.playVoice(['melee_1', 'melee_2']); 

        const hitZone = this.scene.add.zone(this.x + (this.flipX ? -60 : 60), this.y - 100, 140, 90);
        this.scene.physics.add.existing(hitZone);
        
        let hasHit = false;
        this.scene.physics.add.overlap(hitZone, (this.scene as any).enemies, (hz, enemy: any) => {
            if (Math.abs(this.y - enemy.y) <= 60) { 
                if (!hasHit) {
                    (this.scene as any).playSFX(action.includes('punch') ? this.punchImpacts : this.kickImpacts);
                    hasHit = true;
                }
                const damage = 15 * this.damageMultiplier;
                const hitX = (this.x + enemy.x) / 2;
                (this.scene as any).spawnHitEffect(hitX, enemy.y - 80);
                if (enemy.takeDamage) enemy.takeDamage(damage); 
                
                if (hitZone.body) hitZone.body.enable = false; 
            }
        });

        this.once('animationcomplete', () => {
            if (hitZone.active) hitZone.destroy();
            this.isAttacking = false;
        });
    }

    private executeAction(action: string) {
        if (action === 'special') { if (this.smfMeter >= 25) { this.executeMegaphoneScream(); return; } action = 'punch-1'; }
        if (action === 'finisher') { if (this.smfMeter >= 100) { this.executeChainWhip(); return; } action = 'kick-2'; }

        this.isAttacking = true; this.setVelocity(0, 0);
        const animToPlay = `${this.characterName}-${action}`;
        if (this.scene.anims.exists(animToPlay)) this.play(animToPlay, true);
        
        this.playVoice(['melee_1', 'melee_2']);

        const hitZone = this.scene.add.zone(this.x + (this.flipX ? -80 : 80), this.y - 40, 140, 80);
        this.scene.physics.add.existing(hitZone);
        
        let hasHit = false;
        this.scene.physics.add.overlap(hitZone, (this.scene as any).enemies, (hz, enemy: any) => {
            if (Math.abs(this.y - enemy.y) <= 60) { 
                if (!hasHit) {
                    (this.scene as any).playSFX(action.includes('punch') ? this.punchImpacts : this.kickImpacts);
                    hasHit = true;
                }

                const damage = (action.includes('2') ? 15 : 10) * this.damageMultiplier;
                const hitX = (this.x + enemy.x) / 2;
                (this.scene as any).spawnHitEffect(hitX, enemy.y - 50);
                
                if (enemy.takeDamage) enemy.takeDamage(damage); 
                
                if (hitZone.body) hitZone.body.enable = false; 
            }
        });

        this.once('animationcomplete', () => {
            if (hitZone.active) hitZone.destroy();
            if (this.queuedAction) { const next = this.queuedAction; this.queuedAction = null; this.executeAction(next); } 
            else { this.isAttacking = false; this.smfMeter = Math.min(this.smfMeter + 5, 100); (this.scene as any).updateReactHUD(); }
        });
    }

    private executeMegaphoneScream() {
        this.isAttacking = true; this.setVelocity(0, 0); this.smfMeter -= 25; (this.scene as any).updateReactHUD();
        // Updated to explicitly match the JSON mapping 'marko-special-attack'
        const anim = this.scene.anims.exists('marko-special-attack') ? 'marko-special-attack' : 'marko-punch-2';
        this.play(anim, true);
        
        this.playVoice('marko_special_1'); 
        
        this.scene.cameras.main.shake(300, 0.01);
        const direction = this.flipX ? -1 : 1;
        const waveZone = this.scene.add.zone(this.x + (100 * direction), this.y - 40, 200, 100);
        this.scene.physics.add.existing(waveZone);
        
        this.scene.physics.add.overlap(waveZone, (this.scene as any).enemies, (wz, enemy: any) => {
            if (Math.abs(this.y - enemy.y) <= 60) { 
                if (enemy.takeDamage) { enemy.takeDamage(20 * this.damageMultiplier); if (enemy.body) enemy.setVelocityX(200 * direction); }
                (this.scene as any).spawnHitEffect(enemy.x, enemy.y - 50);
            }
        });
        this.scene.time.delayedCall(250, () => { if (waveZone.active) waveZone.destroy(); });
        this.once('animationcomplete', () => { this.isAttacking = false; });
    }

    private executeChainWhip() {
        this.isAttacking = true; this.smfMeter = 0; (this.scene as any).updateReactHUD();
        // Updated to explicitly match the JSON mapping 'marko-finish-move'
        const anim = this.scene.anims.exists('marko-finish-move') ? 'marko-finish-move' : 'marko-kick-2';
        this.play(anim, true);
        
        this.playVoice('marko_special_2'); 

        this.scene.cameras.main.shake(600, 0.02);
        const spinZone = this.scene.add.circle(this.x, this.y - 40, 150);
        this.scene.physics.add.existing(spinZone);
        
        this.scene.physics.overlap(spinZone, (this.scene as any).enemies, (sz, enemy: any) => {
            if (Math.abs(this.y - enemy.y) <= 80) { 
                if (enemy.takeDamage) { enemy.takeDamage(90 * this.damageMultiplier); if (enemy.body) enemy.setVelocityY(-200); }
                (this.scene as any).spawnHitEffect(enemy.x, enemy.y - 50);
            }
        });
        this.scene.time.delayedCall(200, () => { if (spinZone.active) spinZone.destroy(); });
        this.once('animationcomplete', () => { this.isAttacking = false; });
    }

    public takeDamage(amount: number) {
        this.health -= amount; this.queuedAction = null;
        
        (this.scene as any).spawnHitEffect(this.x, this.y - 40);
        this.playVoice(['agony_m_1', 'agony_m_2']); 

        (this.scene as any).lastPlayerHitTime = Date.now();

        if (this.health <= 0) { this.die(); } 
        else {
            const dmgAnim = `${this.characterName}-damage`;
            if (this.scene.anims.exists(dmgAnim)) { this.isAttacking = true; this.play(dmgAnim, true); this.once('animationcomplete', () => { this.isAttacking = false; }); } 
            else { this.setTint(0xff0000); this.scene.time.delayedCall(200, () => this.clearTint()); }
        }
        (this.scene as any).updateReactHUD();
    }

    private die() { 
        this.isDead = true; 
        this.setVelocity(0, 0); 
        const dieAnim = `${this.characterName}-dying`; 
        if (this.scene.anims.exists(dieAnim)) {
            this.play(dieAnim, true); 
        } else {
            this.setTint(0xff0000);
        }
    }
}