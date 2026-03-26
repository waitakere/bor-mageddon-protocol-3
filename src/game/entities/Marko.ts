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

    public equippedWeapon: string | null = null;
    public weaponDurability: number = 0;
    public weaponHitsTaken: number = 0;
    private weaponSprite: Phaser.GameObjects.Sprite | null = null;
    
    private weaponOffsets: Record<string, {x: number, y: number, angle: number}> = {
        'idle': { x: 25, y: -155, angle: 15 }
    };
    
    private currentVoice: any = null;

    private walkSpeed: number = 230; 
    private runSpeed: number = 480; 
    private jumpVelocityX: number = 0; 

    private lastKey: string = '';
    private lastKeyTime: number = 0;
    private isRunning: boolean = false;
    private queuedAction: string | null = null;

    private punchImpacts = ['punch_1', 'punch_2', 'punch_3', 'punch_4', 'punch_5', 'punch_6', 'punch_7', 'punch_8'];
    private kickImpacts = ['kick_1', 'kick_2', 'kick_3', 'kick_4'];
    private grunts = ['grunt_m_1', 'grunt_m_2', 'grunt_m_3', 'grunt_m_4'];
    private agonies = ['agony_m_1', 'agony_m_2', 'agony_m_3', 'agony_m_4'];

    constructor(scene: Phaser.Scene, x: number, y: number) {
        const texture = scene.textures.get('marko');
        const allFrames = texture ? texture.getFrameNames() : [];
        const firstFrame = allFrames.find(f => f.includes('marko-idle')) || allFrames;

        super(scene, x, y, 'marko', firstFrame);
        scene.add.existing(this); 
        scene.physics.add.existing(this);
        
        this.setOrigin(0.5, 1);
        this.setScale(1.7); 

        if (this.body) {
            this.body.setSize(80, 30); 
            this.body.setOffset(this.width / 2 - 40, this.height - 30);
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
            'shoot', 'shoot-recoil', 'shoot-up', 'shoot-with-rifle', 'walk-rifle'
        ];

        animTypes.forEach(animType => {
            const animKey = `${this.characterName}-${animType}`;
            if (anims.exists(animKey)) return;

            const searchStr = `${animKey}/frame_`;
            const matchingFrames = allFrames.filter(f => f.includes(searchStr)).sort();

            if (matchingFrames.length > 0) {
                let fps = 15;
                if (animType === 'idle') fps = 6;
                else if (animType === 'walk' || animType === 'walk-rifle') fps = 12;
                else if (animType === 'run') fps = 18;
                else if (animType === 'jump') fps = 8;
                else if (animType === 'finish-move') fps = 24; 
                else if (animType === 'throw') fps = 18; 

                const frameConfig: Phaser.Types.Animations.AnimationFrameConfig[] = matchingFrames.map(f => {
                    return { key: this.characterName, frame: f };
                });

                if (animType === 'special-attack' && frameConfig.length > 0) {
                    const lastFrame = frameConfig[frameConfig.length - 1];
                    for (let i = 0; i < 8; i++) {
                        frameConfig.push(lastFrame);
                    }
                }

                anims.create({
                    key: animKey,
                    frames: frameConfig,
                    frameRate: fps,
                    repeat: (animType === 'idle' || animType === 'walk' || animType === 'walk-rifle' || animType === 'run') ? -1 : 0
                });
            }
        });
    }

    public equipWeapon(weaponKey: string) {
        if (this.weaponSprite) this.weaponSprite.destroy();

        this.equippedWeapon = weaponKey;
        this.weaponHitsTaken = 0;
        
        if (weaponKey === 'M70-FINAL rev') {
            this.weaponDurability = 5; 
            this.weaponSprite = null; 
        } else {
            this.weaponDurability = 5;
            this.weaponSprite = this.scene.add.sprite(this.x, this.y, weaponKey);
            (this.weaponSprite as any).isWeaponSprite = true; 
            this.weaponSprite.setScale(1.3);
            this.weaponSprite.setOrigin(0.5, 0.8);
        }
    }

    public dropCurrentWeapon() {
        if (!this.equippedWeapon) return;

        const drop = this.scene.physics.add.sprite(this.x, this.y - 40, this.equippedWeapon);
        (drop as any).isWeaponPickup = true;
        (drop as any).weaponType = this.equippedWeapon;
        
        if (this.equippedWeapon === 'M70-FINAL rev') drop.setScale(1.0); 
        else drop.setScale(1.3);
        
        (this.scene as any).items.add(drop);
        
        this.equippedWeapon = null;
        if (this.weaponSprite) { 
            this.weaponSprite.destroy(); 
            this.weaponSprite = null; 
        }
    }

    private positionWeaponSprite() {
        if (!this.weaponSprite || !this.equippedWeapon) return;
        
        this.weaponSprite.visible = true;

        const currentAnimKey = this.anims.currentAnim?.key.replace(`${this.characterName}-`, '') || 'idle';
        const currentFrameName = this.anims.currentFrame?.textureFrame as string || '';
        const dirX = this.flipX ? -1 : 1;
        const jumpVisualOffset = this.height - this.displayOriginY;

        let targetX = this.x;
        let targetY = this.y + jumpVisualOffset;
        let targetAngle = 0;
        let targetDepth = this.depth + 1;

        if (['special-attack', 'finish-move', 'jump-punch', 'jump-kick', 'knockdown-get-up'].includes(currentAnimKey)) {
            this.weaponSprite.visible = false;
            return; 
        }

        else if (currentAnimKey === 'throw') {
            if (currentFrameName.includes('000') || currentFrameName.includes('001') || currentFrameName.includes('002') || currentFrameName.includes('003') || currentFrameName.includes('004')) {
                targetX += (-10 * dirX);
                targetY -= 170;
                targetAngle = -30 * dirX;
                targetDepth = this.depth - 1; 
            } else if (currentFrameName.includes('005') || currentFrameName.includes('006') || currentFrameName.includes('007') || currentFrameName.includes('008') || currentFrameName.includes('009') || currentFrameName.includes('010') || currentFrameName.includes('011') || currentFrameName.includes('012') || currentFrameName.includes('013') || currentFrameName.includes('014') || currentFrameName.includes('015')) {
                targetX += (-30 * dirX);
                targetY -= 180;
                targetAngle = -60 * dirX;
                targetDepth = this.depth - 1;
            } else if (currentFrameName.includes('016') || currentFrameName.includes('017') || currentFrameName.includes('018') || currentFrameName.includes('019')) {
                targetX += (20 * dirX);
                targetY -= 170;
                targetAngle = 45 * dirX;
                targetDepth = this.depth + 1; 
            } else {
                targetX += (70 * dirX);
                targetY -= 150;
                targetAngle = 90 * dirX; 
                targetDepth = this.depth + 1;
            }
        }

        else if (currentAnimKey === 'walk') {
            if (currentFrameName.includes('002') || currentFrameName.includes('003') || currentFrameName.includes('004')) {
                targetX += (40 * dirX);
                targetY -= 160;
                targetAngle = 25 * dirX;
            } 
            else if (currentFrameName.includes('006') || currentFrameName.includes('007') || currentFrameName.includes('008')) {
                targetX += (20 * dirX);
                targetY -= 160;
                targetAngle = 5 * dirX;
            } 
            else {
                targetX += (30 * dirX);
                targetY -= 160;
                targetAngle = 15 * dirX;
            }
        } 
        
        else if (currentAnimKey === 'run') {
            if (currentFrameName.includes('003') || currentFrameName.includes('004') || currentFrameName.includes('005')) {
                targetX += (45 * dirX);
                targetY -= 165;
                targetAngle = 35 * dirX;
            } 
            else if (currentFrameName.includes('007') || currentFrameName.includes('008') || currentFrameName.includes('009') || currentFrameName.includes('000')) {
                targetX += (-5 * dirX);
                targetY -= 160;
                targetAngle = -15 * dirX;
            } 
            else {
                targetX += (20 * dirX);
                targetY -= 160;
                targetAngle = 10 * dirX;
            }
        }

        else if (currentAnimKey === 'jump') {
            if (currentFrameName.includes('002') || currentFrameName.includes('003') || currentFrameName.includes('004')) {
                targetX += (25 * dirX);
                targetY -= 195;
                targetAngle = -15 * dirX;
            } else {
                targetX += (30 * dirX);
                targetY -= 155;
                targetAngle = 15 * dirX;
            }
        }

        else {
            const offset = this.weaponOffsets[currentAnimKey] || this.weaponOffsets['idle'];
            targetX += (offset.x * dirX);
            targetY += offset.y;
            targetAngle = offset.angle * dirX;
            targetDepth = this.depth + 1;
        }
        
        this.weaponSprite.setPosition(targetX, targetY);
        this.weaponSprite.setAngle(targetAngle);
        this.weaponSprite.setFlipX(this.flipX);
        this.weaponSprite.setDepth(targetDepth);
    }

    private throwWeapon() {
        if (!this.equippedWeapon) return;

        const dirX = this.flipX ? -1 : 1;
        (this.scene as any).spawnProjectile(this.x + (20 * dirX), this.y - 120, this.equippedWeapon, dirX, 50, true); 

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
            if (this.scene.anims.exists(`${this.characterName}-shoot-with-rifle`)) {
                this.play(`${this.characterName}-shoot-with-rifle`, true);
            } else if (this.scene.anims.exists(`${this.characterName}-shoot`)) {
                this.play(`${this.characterName}-shoot`, true);
            }
            
            const dirX = this.flipX ? -1 : 1;
            
            // FIXED: Play the gunshot SFX!
            (this.scene as any).playSFX('gun-shot-m70', 1.0);

            // Spawn bullet
            (this.scene as any).spawnProjectile(this.x + (80 * dirX), this.y - 155, 'bullet', dirX, 30, false);
            
            // FIXED: Muzzle Flash directly instantiated, scaled up, and flipped correctly to face the bullet direction
            const flash = this.scene.add.sprite(this.x + (100 * dirX), this.y - 155, 'muzzle-flash-m70');
            flash.setDepth(this.depth + 2);
            flash.setFlipX(this.flipX); 
            flash.setScale(1.0); 
            flash.setBlendMode(Phaser.BlendModes.ADD);
            this.scene.tweens.add({ targets: flash, alpha: 0, duration: 100, onComplete: () => flash.destroy() });

            this.scene.cameras.main.shake(100, 0.01);
            
            this.weaponDurability--;
            if (this.weaponDurability <= 0) {
                this.scene.time.delayedCall(150, () => {
                    if (this.scene.anims.exists(`${this.characterName}-throw`)) {
                        this.play(`${this.characterName}-throw`, true);
                    }
                    this.scene.time.delayedCall(300, () => this.throwWeapon());
                    this.scene.time.delayedCall(500, () => { this.isAttacking = false; });
                });
            } else {
                this.scene.time.delayedCall(300, () => { this.isAttacking = false; });
            }

        } else {
            this.weaponDurability--;

            if (this.weaponDurability <= 0) {
                if (this.scene.anims.exists(`${this.characterName}-throw`)) {
                    this.play(`${this.characterName}-throw`, true);
                } else {
                    this.play(`${this.characterName}-punch-2`, true);
                }

                this.scene.time.delayedCall(500, () => this.throwWeapon());
                
                this.once('animationcomplete', () => {
                    this.isAttacking = false;
                });
                return; 
            }

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
            
            const startOriginY = this.displayOriginY;
            this.scene.tweens.add({ 
                targets: this, 
                displayOriginY: startOriginY + 220, 
                duration: 400, 
                yoyo: true, 
                ease: 'Quad.easeOut', 
                onComplete: () => { 
                    this.isJumping = false; 
                    this.displayOriginY = startOriginY; 
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
                    if (this.isRunning) {
                        this.play(`${this.characterName}-run`, true);
                    } else {
                        if (this.equippedWeapon === 'M70-FINAL rev' && this.scene.anims.exists(`${this.characterName}-walk-rifle`)) {
                            this.play(`${this.characterName}-walk-rifle`, true);
                        } else {
                            this.play(`${this.characterName}-walk`, true);
                        }
                    }
                } else { 
                    if (this.equippedWeapon === 'M70-FINAL rev' && this.scene.anims.exists(`${this.characterName}-shoot-with-rifle`)) {
                        this.play(`${this.characterName}-shoot-with-rifle`, true);
                    } else {
                        this.play(`${this.characterName}-idle`, true); 
                    }
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
        if (action === 'special') { this.executeMegaphoneScream(); return; }
        if (action === 'finisher') { this.executeChainWhip(); return; }

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

    private executeMegaphoneScream() {
        this.isAttacking = true; this.setVelocity(0, 0);
        const anim = this.scene.anims.exists(`${this.characterName}-special-attack`) ? `${this.characterName}-special-attack` : `${this.characterName}-punch-2`;
        if (this.scene.anims.exists(anim)) this.play(anim, true);
        
        (this.scene as any).playSFX('marko_special_1'); 
        (this.scene as any).triggerScreenGlitch(400); 
        
        const waveZone = this.scene.add.circle(this.x, this.y - 40, 180);
        this.scene.physics.add.existing(waveZone);
        
        const targets = [(this.scene as any).enemies, (this.scene as any).breakables];
        this.scene.physics.add.overlap(waveZone, targets, (wz, target: any) => {
            const yTol = target.isBreakable ? 160 : 60;
            if (Math.abs(this.y - target.y) <= yTol) { 
                const pushDir = target.x > this.x ? 1 : -1; 
                if (target.takeDamage) { 
                    target.takeDamage(20 * this.damageMultiplier); 
                    if (target.body && target.type !== 'obj_kiosk' && target.type !== 'obj_kontejner') {
                        target.setVelocityX(250 * pushDir); 
                    }
                }
                (this.scene as any).spawnHitEffect(target.x, target.y - 50);
            }
        });
        this.scene.time.delayedCall(250, () => { if (waveZone.active) waveZone.destroy(); });
        this.once('animationcomplete', () => { this.isAttacking = false; });
    }

    private executeChainWhip() {
        this.isAttacking = true;
        const anim = this.scene.anims.exists(`${this.characterName}-finish-move`) ? `${this.characterName}-finish-move` : `${this.characterName}-kick-2`;
        if (this.scene.anims.exists(anim)) this.play(anim, true);
        
        (this.scene as any).playSFX('marko_special_2'); 
        (this.scene as any).triggerScreenGlitch(500); 

        const spinZone = this.scene.add.circle(this.x, this.y - 40, 150);
        this.scene.physics.add.existing(spinZone);
        
        const targets = [(this.scene as any).enemies, (this.scene as any).breakables];
        this.scene.physics.overlap(spinZone, targets, (sz, target: any) => {
            const yTol = target.isBreakable ? 160 : 80;
            if (Math.abs(this.y - target.y) <= yTol) { 
                if (target.takeDamage) { target.takeDamage(90 * this.damageMultiplier); if (target.body && target.type !== 'obj_kiosk' && target.type !== 'obj_kontejner') target.setVelocityY(-200); }
                (this.scene as any).spawnHitEffect(target.x, target.y - 50);
            }
        });
        this.scene.time.delayedCall(200, () => { if (spinZone.active) spinZone.destroy(); });
        this.once('animationcomplete', () => { this.isAttacking = false; });
    }

    public takeDamage(amount: number) {
        this.health -= amount; 
        this.queuedAction = null;
        
        (this.scene as any).spawnHitEffect(this.x, this.y - 40);
        (this.scene as any).lastPlayerHitTime = Date.now();

        if (this.equippedWeapon) {
            this.weaponHitsTaken++;
            if (this.weaponHitsTaken >= 2) {
                this.dropCurrentWeapon();
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

    public takeKnockdown(amount: number = 15) {
        this.health -= amount;
        this.queuedAction = null;
        
        (this.scene as any).spawnHitEffect(this.x, this.y - 40);
        (this.scene as any).lastPlayerHitTime = Date.now();

        if (this.equippedWeapon) {
            this.dropCurrentWeapon();
        }

        if (this.health <= 0) { 
            (this.scene as any).playSFX(this.agonies);
            this.die(); 
        } else {
            (this.scene as any).playSFX(this.grunts);
            const anim = `${this.characterName}-knockdown-get-up`;
            if (this.scene.anims.exists(anim)) { 
                this.isAttacking = true; 
                this.play(anim, true); 
                this.once('animationcomplete', () => { this.isAttacking = false; }); 
            } else {
                this.setTint(0xff0000); 
                this.scene.time.delayedCall(200, () => this.clearTint());
            }
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