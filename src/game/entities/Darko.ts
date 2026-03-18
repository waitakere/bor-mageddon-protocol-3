import Phaser from 'phaser';

export class Darko extends Phaser.Physics.Arcade.Sprite {
    public health: number = 90;
    public maxHealth: number = 90; 
    public smfMeter: number = 0;
    public characterName: string = 'darko';
    public damageMultiplier: number = 0.7; 
    public isAttacking: boolean = false;
    public isDead: boolean = false;
    public isJumping: boolean = false;

    private currentVoice: any = null;

    private walkSpeed: number = 250;
    private runSpeed: number = 460;
    private lastKey: string = '';
    private lastKeyTime: number = 0;
    private isRunning: boolean = false;
    private queuedAction: string | null = null;

    private punchImpacts = ['punch_1', 'punch_2', 'punch_3', 'punch_4', 'punch_5', 'punch_6', 'punch_7', 'punch_8'];
    private kickImpacts = ['kick_1', 'kick_2', 'kick_3', 'kick_4'];

    constructor(scene: Phaser.Scene, x: number, y: number) {
        const texture = scene.textures.get('darko');
        const firstFrame = texture ? texture.getFrameNames()[0] : 'darko-idle/frame_000.png';
        
        super(scene, x, y, 'darko', firstFrame);
        scene.add.existing(this); scene.physics.add.existing(this);
        
        this.setOrigin(0.5, 1);
        this.setScale(1.7); 
        
        if (this.body) {
            this.body.setSize(50, 30); this.body.setOffset(this.width / 2 - 25, this.height - 30);
            (this.body as Phaser.Physics.Arcade.Body).setAllowRotation(false);
        }
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
            this.playVoice(['grunt_m_3', 'grunt_m_4']); 
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
                
                // FIX: Disable body safely instead of destroying it mid-physics step
                if (hitZone.body) hitZone.body.enable = false; 
            }
        });

        this.once('animationcomplete', () => {
            if (hitZone.active) hitZone.destroy();
            this.isAttacking = false;
        });
    }

    private executeAction(action: string) {
        if (action === 'special') { if (this.smfMeter >= 25) { this.executeRoundhouseSpin(); return; } action = 'kick-1'; }
        if (action === 'finisher') { if (this.smfMeter >= 100) { this.executeGuitarRiff(); return; } action = 'punch-2'; }

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
                
                // FIX: Disable body safely instead of destroying it mid-physics step
                if (hitZone.body) hitZone.body.enable = false; 
            }
        });

        this.once('animationcomplete', () => {
            if (hitZone.active) hitZone.destroy();
            if (this.queuedAction) { const next = this.queuedAction; this.queuedAction = null; this.executeAction(next); } 
            else { this.isAttacking = false; this.smfMeter = Math.min(this.smfMeter + 5, 100); (this.scene as any).updateReactHUD(); }
        });
    }

    private executeRoundhouseSpin() {
        this.isAttacking = true; this.setVelocity(0, 0); this.smfMeter -= 25; (this.scene as any).updateReactHUD();
        const anim = this.scene.anims.exists('darko-special') ? 'darko-special' : 'darko-kick-2';
        this.play(anim, true);
        
        this.playVoice('darko_special_1'); 

        const spinZone = this.scene.add.circle(this.x, this.y - 40, 100);
        this.scene.physics.add.existing(spinZone);
        this.scene.physics.add.overlap(spinZone, (this.scene as any).enemies, (sz, enemy: any) => {
            if (Math.abs(this.y - enemy.y) <= 60) {
                if (enemy.takeDamage) { enemy.takeDamage(20 * this.damageMultiplier); const pushDir = enemy.x > this.x ? 1 : -1; if (enemy.body) enemy.setVelocityX(300 * pushDir); }
                (this.scene as any).spawnHitEffect(enemy.x, enemy.y - 50);
            }
        });
        this.scene.time.delayedCall(200, () => { if (spinZone.active) spinZone.destroy(); });
        this.once('animationcomplete', () => { this.isAttacking = false; });
    }

    private executeGuitarRiff() {
        this.isAttacking = true; this.smfMeter = 0; (this.scene as any).updateReactHUD();
        const anim = this.scene.anims.exists('darko-finisher') ? 'darko-finisher' : 'darko-punch-2';
        this.play(anim, true);
        
        this.playVoice('forbidden_riff'); 

        this.scene.cameras.main.shake(800, 0.015); this.scene.cameras.main.flash(300, 0, 255, 255);
        const enemies = (this.scene as any).enemies.getChildren();
        enemies.forEach((enemy: any) => {
            if (!enemy.isDead && Math.abs(this.y - enemy.y) <= 100) { 
                if (enemy.takeDamage) enemy.takeDamage(100); 
                enemy.setTint(0x00ffff); this.scene.time.delayedCall(200, () => enemy.clearTint());
                (this.scene as any).spawnHitEffect(enemy.x, enemy.y - 50);
            }
        });
        this.once('animationcomplete', () => { this.isAttacking = false; });
    }

    public takeDamage(amount: number) {
        this.health -= amount; this.queuedAction = null;
        
        (this.scene as any).spawnHitEffect(this.x, this.y - 40);
        this.playVoice(['agony_m_3', 'agony_m_4']); 

        // RED FLASH TRIGGER
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