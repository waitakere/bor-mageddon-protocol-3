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

    // Weapon System
    public equippedWeapon: string | null = null;
    public weaponDurability: number = 0;
    public weaponHitsTaken: number = 0;
    private weaponSprite: Phaser.GameObjects.Sprite | null = null;
    
    private weaponOffsets: Record<string, {x: number, y: number, angle: number}> = {
        'idle': { x: 30, y: -110, angle: -15 },
        'walk': { x: 35, y: -115, angle: -5 },
        'run':  { x: 45, y: -110, angle: 15 },
        'jump': { x: 25, y: -120, angle: -30 },
        'melee':{ x: 70, y: -110, angle: 80 }, 
        'shoot':{ x: 60, y: -105, angle: 0 }
    };

    private currentVoice: any = null;

    private walkSpeed: number = 280; 
    private runSpeed: number = 560; 
    
    private jumpVelocityX: number = 0; 

    private lastKey: string = '';
    private lastKeyTime: number = 0;
    private isRunning: boolean = false;
    private queuedAction: string | null = null;

    private punchImpacts = ['punch_1', 'punch_2', 'punch_3', 'punch_4', 'punch_5', 'punch_6', 'punch_7', 'punch_8'];
    private kickImpacts = ['kick_1', 'kick_2', 'kick_3', 'kick_4'];
    private grunts = ['grunt_m_1', 'grunt_m_2', 'grunt_m_3', 'grunt_m_4'];
    private agonies = ['agony_m_1', 'agony_m_2', 'agony_m_3', 'agony_m_4'];
    
    private specialAudio = ['darko_special_1', 'darko_special_2', 'darko-special-smf'];

    constructor(scene: Phaser.Scene, x: number, y: number) {
        const texture = scene.textures.get('darko');
        const allFrames = texture ? texture.getFrameNames() : [];
        const firstFrame = allFrames.find(f => f.includes('darko-idle')) || allFrames;
        
        super(scene, x, y, 'darko', firstFrame);
        scene.add.existing(this); 
        scene.physics.add.existing(this);
        
        this.setOrigin(0.5, 1);
        this.setScale(1.7); 
        
        if (this.body) {
            this.body.setSize(50, 30); 
            this.body.setOffset(this.width / 2 - 25, this.height - 30);
            (this.body as Phaser.Physics.Arcade.Body).setAllowRotation(false);
        }

        this.createAnimations();
    }

    private createAnimations() {
        const anims = this.scene.anims;
        if (anims.exists(`${this.characterName}-idle`)) return;

        const texture = this.scene.textures.get(this.characterName);
        if (!texture || texture.key === '__MISSING') return;

        const allFrames = texture.getFrameNames();
        
        const animTypes = [
            'idle', 'walk', 'run', 'jump', 'punch-1', 'punch-2', 'kick-1', 'kick-2', 
            'melee', 'jump-punch', 'jump-kick', 'special-attack', 'finish-move', 
            'throw', 'damage', 'knockdown-get-up', 'dying', 'pick-up', 
            'shoot', 'shoot-recoil', 'shoot-up'
        ];

        animTypes.forEach(animType => {
            const animKey = `${this.characterName}-${animType}`;
            if (anims.exists(animKey)) return;

            const searchStr = `${animKey}/frame_`;
            const matchingFrames = allFrames.filter(f => f.includes(searchStr)).sort();

            if (matchingFrames.length > 0) {
                let fps = 15;
                if (animType === 'idle') fps = 6;
                else if (animType === 'walk') fps = 12;
                else if (animType === 'run') fps = 18;
                else if (animType === 'jump') fps = 8;

                anims.create({
                    key: animKey,
                    frames: matchingFrames.map(f => ({ key: this.characterName, frame: f })),
                    frameRate: fps,
                    repeat: (animType === 'idle' || animType === 'walk' || animType === 'run') ? -1 : 0
                });
            }
        });
    }

    public equipWeapon(weaponKey: string) {
        if (this.weaponSprite) this.weaponSprite.destroy();

        this.equippedWeapon = weaponKey;
        this.weaponDurability = 4;
        this.weaponHitsTaken = 0;

        this.weaponSprite = this.scene.add.sprite(this.x, this.y, weaponKey);
        (this.weaponSprite as any).isWeaponSprite = true; 
        
        if (weaponKey === 'M70-FINAL rev') this.weaponSprite.setScale(0.45);
        else this.weaponSprite.setScale(1.3);
    }

    private positionWeaponSprite() {
        if (!this.weaponSprite || !this.equippedWeapon) return;

        const currentAnim = this.anims.currentAnim?.key.replace(`${this.characterName}-`, '') || 'idle';
        const offset = this.weaponOffsets[currentAnim] || this.weaponOffsets['idle'];
        const dirX = this.flipX ? -1 : 1;
        
        const jumpVisualOffset = this.height - this.displayOriginY;

        this.weaponSprite.setPosition(this.x + (offset.x * dirX), this.y + offset.y + jumpVisualOffset);
        this.weaponSprite.setAngle(offset.angle * dirX);
        this.weaponSprite.setFlipX(this.flipX);
        this.weaponSprite.setDepth(this.depth + 1);
    }

    private throwWeapon() {
        if (!this.equippedWeapon) return;

        const dirX = this.flipX ? -1 : 1;
        (this.scene as any).spawnProjectile(this.x, this.y - 50, this.equippedWeapon, dirX, 50, true);

        this.equippedWeapon = null;
        if (this.weaponSprite) {
            this.weaponSprite.destroy();
            this.weaponSprite = null;
        }
    }

    private executeWeaponAttack() {
        this.isAttacking = true;
        this.setVelocity(0, 0);

        if (this.equippedWeapon === 'M70-FINAL rev') {
            if (this.scene.anims.exists(`${this.characterName}-shoot`)) {
                this.play(`${this.characterName}-shoot`, true);
            }
            
            const dirX = this.flipX ? -1 : 1;
            (this.scene as any).spawnProjectile(this.x + (60 * dirX), this.y - 100, 'bullet', dirX, 30, false);
            
            if (this.scene.textures.exists('muzzle-flash-m70')) {
                const flash = this.scene.add.sprite(this.x + (90 * dirX), this.y - 100, 'muzzle-flash-m70');
                flash.setDepth(this.depth + 2);
                flash.setFlipX(!this.flipX);
                flash.setScale(0.6);
                flash.setBlendMode(Phaser.BlendModes.ADD);
                this.scene.tweens.add({ targets: flash, alpha: 0, duration: 80, onComplete: () => flash.destroy() });
            }

            this.scene.cameras.main.shake(100, 0.01);
            
            this.weaponDurability--;
            if (this.weaponDurability <= 0) {
                this.scene.time.delayedCall(200, () => this.throwWeapon());
            }

            this.scene.time.delayedCall(300, () => { this.isAttacking = false; });

        } else {
            const animToPlay = this.scene.anims.exists(`${this.characterName}-melee`) ? `${this.characterName}-melee` : `${this.characterName}-punch-2`;
            this.play(animToPlay, true);

            const hitZone = this.scene.add.zone(this.x + (this.flipX ? -80 : 80), this.y - 60, 160, 100);
            this.scene.physics.add.existing(hitZone);
            
            let hasHit = false;
            const targets = [(this.scene as any).enemies, (this.scene as any).breakables];

            this.scene.physics.add.overlap(hitZone, targets, (hz, target: any) => {
                const yTol = target.isBreakable ? 140 : 60;
                if (Math.abs(this.y - target.y) <= yTol) { 
                    if (!hasHit) {
                        (this.scene as any).playSFX(['punch_4', 'punch_5']); 
                        hasHit = true;
                        
                        this.weaponDurability--;
                        if (this.weaponDurability <= 0) {
                            this.scene.time.delayedCall(300, () => this.throwWeapon());
                        }
                    }
                    
                    const hitX = (this.x + target.x) / 2;
                    (this.scene as any).spawnBlood(hitX, target.y - 50); 
                    if (target.takeDamage) target.takeDamage(25 * this.damageMultiplier); 
                    if (hitZone.body) hitZone.body.enable = false; 
                }
            });

            this.once('animationcomplete', () => {
                if (hitZone.active) hitZone.destroy();
                this.isAttacking = false;
            });
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

        if (this.scene.anims.exists(`${this.characterName}-idle`)) {
            this.play(`${this.characterName}-idle`, true);
        }
        
        this.setTintFill(0x39ff14); 
        this.scene.time.delayedCall(100, () => this.clearTint());

        this.scene.time.delayedCall(300, () => {
            this.isAttacking = false;
        });
    }

    public update(input: any) {
        if (this.isDead) return;
        this.setAngle(0);

        this.positionWeaponSprite();

        if (input.space && !this.isJumping && !this.isAttacking) {
            this.isJumping = true;
            
            if (input.left) this.jumpVelocityX = -this.runSpeed * 1.2; 
            else if (input.right) this.jumpVelocityX = this.runSpeed * 1.2;
            else this.jumpVelocityX = 0;

            if (this.scene.anims.exists(`${this.characterName}-jump`)) {
                this.play(`${this.characterName}-jump`, true);
            }

            this.scene.tweens.add({ 
                targets: this, 
                displayOriginY: this.height + 220, 
                duration: 400, 
                yoyo: true, 
                ease: 'Quad.easeOut', 
                onComplete: () => { 
                    this.isJumping = false; 
                    this.displayOriginY = this.height; 
                    if (!this.isAttacking && this.scene.anims.exists(`${this.characterName}-idle`)) {
                        this.play(`${this.characterName}-idle`, true);
                    }
                }
            });
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
            } else if (!this.isJumping) {
                if (this.isAttacking && (requestedAction === 'special' || requestedAction === 'finisher')) {
                    this.isAttacking = false; 
                    const oldZone = this.scene.children.getByName('basicAttackZone');
                    if (oldZone) oldZone.destroy();
                }

                if (!this.isAttacking) {
                    if (this.equippedWeapon && (requestedAction === 'punch-1' || requestedAction === 'punch-2')) {
                        this.executeWeaponAttack();
                    } else {
                        this.executeAction(requestedAction);
                    }
                } else {
                    this.queuedAction = requestedAction;
                }
            }
            return; 
        }

        if (!this.isAttacking) {
            let vx = 0;
            let vy = 0;

            if (this.isJumping) {
                vx = this.jumpVelocityX;
            } else {
                const speed = this.isRunning ? this.runSpeed : this.walkSpeed;
                vx = input.left ? -speed : (input.right ? speed : 0);
                vy = input.up ? -speed * 0.6 : (input.down ? speed * 0.6 : 0);
            }

            this.setVelocity(vx, vy);
            if (vx !== 0) this.setFlipX(vx < 0);
            
            if (!this.isJumping) {
                if (vx !== 0 || vy !== 0) {
                    const anim = this.isRunning ? `${this.characterName}-run` : `${this.characterName}-walk`;
                    if (this.scene.anims.exists(anim)) this.play(anim, true);
                    else if (this.scene.anims.exists(`${this.characterName}-walk`)) this.play(`${this.characterName}-walk`, true);
                } else { 
                    if (this.scene.anims.exists(`${this.characterName}-idle`)) this.play(`${this.characterName}-idle`, true); 
                }
            }
        } else {
            if (this.isJumping) {
                this.setVelocity(this.jumpVelocityX, 0);
            }
        }
    }

    private executeJumpAttack(action: string) {
        this.isAttacking = true;
        const type = action.includes('punch') ? 'jump-punch' : 'jump-kick';
        const animToPlay = `${this.characterName}-${type}`;
        
        if (this.scene.anims.exists(animToPlay)) this.play(animToPlay, true);
        else if (this.scene.anims.exists(`${this.characterName}-kick-1`)) this.play(`${this.characterName}-kick-1`, true); 
        
        const hitZone = this.scene.add.zone(this.x + (this.flipX ? -60 : 60), this.y - 100, 140, 90);
        this.scene.physics.add.existing(hitZone);
        
        let hasHit = false;
        const targets = [(this.scene as any).enemies, (this.scene as any).breakables];

        this.scene.physics.add.overlap(hitZone, targets, (hz, target: any) => {
            const yTol = target.isBreakable ? 140 : 60;
            if (Math.abs(this.y - target.y) <= yTol) { 
                if (!hasHit) {
                    (this.scene as any).playSFX(action.includes('punch') ? this.punchImpacts : this.kickImpacts);
                    hasHit = true;
                }
                const damage = 15 * this.damageMultiplier;
                const hitX = (this.x + target.x) / 2;
                (this.scene as any).spawnHitEffect(hitX, target.y - 80);
                if (target.takeDamage) target.takeDamage(damage); 
                if (hitZone.body) hitZone.body.enable = false; 
            }
        });

        this.once('animationcomplete', () => {
            if (hitZone.active) hitZone.destroy();
            this.isAttacking = false;
        });
    }

    private executeAction(action: string) {
        if (action === 'special') { this.executeRoundhouseSpin(); return; }
        if (action === 'finisher') { this.executeGuitarRiff(); return; }

        this.isAttacking = true; this.setVelocity(0, 0);
        const animToPlay = `${this.characterName}-${action}`;
        if (this.scene.anims.exists(animToPlay)) this.play(animToPlay, true);

        const hitZone = this.scene.add.zone(this.x + (this.flipX ? -80 : 80), this.y - 40, 140, 80);
        hitZone.setName('basicAttackZone');
        this.scene.physics.add.existing(hitZone);
        
        let hasHit = false;
        const targets = [(this.scene as any).enemies, (this.scene as any).breakables];

        this.scene.physics.add.overlap(hitZone, targets, (hz, target: any) => {
            const yTol = target.isBreakable ? 140 : 60;
            if (Math.abs(this.y - target.y) <= yTol) { 
                if (!hasHit) {
                    (this.scene as any).playSFX(action.includes('punch') ? this.punchImpacts : this.kickImpacts);
                    hasHit = true;
                }
                const damage = (action.includes('2') ? 15 : 10) * this.damageMultiplier;
                const hitX = (this.x + target.x) / 2;
                (this.scene as any).spawnHitEffect(hitX, target.y - 50);
                if (target.takeDamage) target.takeDamage(damage); 
                if (hitZone.body) hitZone.body.enable = false; 
            }
        });

        this.once('animationcomplete', () => {
            if (hitZone.active) hitZone.destroy();
            if (this.queuedAction) { const next = this.queuedAction; this.queuedAction = null; this.executeAction(next); } 
            else { this.isAttacking = false; }
        });
    }

    private executeRoundhouseSpin() {
        this.isAttacking = true; this.setVelocity(0, 0);
        const anim = this.scene.anims.exists(`${this.characterName}-special-attack`) ? `${this.characterName}-special-attack` : `${this.characterName}-kick-2`;
        if (this.scene.anims.exists(anim)) this.play(anim, true);
        
        (this.scene as any).playSFX(this.specialAudio); 
        (this.scene as any).triggerScreenGlitch(300);

        const spinZone = this.scene.add.circle(this.x, this.y - 40, 140); 
        this.scene.physics.add.existing(spinZone);

        const targets = [(this.scene as any).enemies, (this.scene as any).breakables];
        this.scene.physics.add.overlap(spinZone, targets, (sz, target: any) => {
            const yTol = target.isBreakable ? 160 : 60;
            if (Math.abs(this.y - target.y) <= yTol) {
                if (target.takeDamage) { target.takeDamage(20 * this.damageMultiplier); const pushDir = target.x > this.x ? 1 : -1; if (target.body && target.type !== 'obj_kiosk' && target.type !== 'obj_kontejner') target.setVelocityX(300 * pushDir); }
                (this.scene as any).spawnHitEffect(target.x, target.y - 50);
            }
        });
        this.scene.time.delayedCall(200, () => { if (spinZone.active) spinZone.destroy(); });
        this.once('animationcomplete', () => { this.isAttacking = false; });
    }

    private executeGuitarRiff() {
        this.isAttacking = true;
        const anim = this.scene.anims.exists(`${this.characterName}-finish-move`) ? `${this.characterName}-finish-move` : `${this.characterName}-punch-2`;
        if (this.scene.anims.exists(anim)) this.play(anim, true);
        
        (this.scene as any).playSFX(this.specialAudio); 
        (this.scene as any).triggerScreenGlitch(600); 
        
        const enemies = (this.scene as any).enemies.getChildren();
        const breakables = (this.scene as any).breakables ? (this.scene as any).breakables.getChildren() : [];
        [...enemies, ...breakables].forEach((target: any) => {
            const yTol = target.isBreakable ? 160 : 100;
            if (!target.isDead && Math.abs(this.y - target.y) <= yTol) { 
                if (target.takeDamage) target.takeDamage(100); 
                target.setTint(0x00ffff); this.scene.time.delayedCall(200, () => target.clearTint());
                (this.scene as any).spawnHitEffect(target.x, target.y - 50);
            }
        });
        this.once('animationcomplete', () => { this.isAttacking = false; });
    }

    public takeDamage(amount: number) {
        this.health -= amount; this.queuedAction = null;
        
        (this.scene as any).spawnHitEffect(this.x, this.y - 40);
        (this.scene as any).lastPlayerHitTime = Date.now();

        if (this.equippedWeapon) {
            this.weaponHitsTaken++;
            if (this.weaponHitsTaken >= 2) {
                const drop = this.scene.physics.add.sprite(this.x, this.y - 40, this.equippedWeapon);
                (drop as any).isWeaponPickup = true;
                (drop as any).weaponType = this.equippedWeapon;
                if (this.equippedWeapon === 'M70-FINAL rev') drop.setScale(0.45); else drop.setScale(1.3);
                (this.scene as any).items.add(drop);
                
                this.equippedWeapon = null;
                if (this.weaponSprite) { this.weaponSprite.destroy(); this.weaponSprite = null; }
            }
        }

        if (this.health <= 0) { 
            (this.scene as any).playSFX(this.agonies);
            this.die(); 
        } 
        else {
            (this.scene as any).playSFX(this.grunts);
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
        if (this.weaponSprite) this.weaponSprite.destroy();
    }
}