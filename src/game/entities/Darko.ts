import Phaser from 'phaser';
import { CHARACTER_STATS } from '../config/CharacterStats';

export class Darko extends Phaser.Physics.Arcade.Sprite {

    public health: number = CHARACTER_STATS.darko_1993.maxHealth;
    public maxHealth: number = CHARACTER_STATS.darko_1993.maxHealth;
    public smfMeter: number = 0;
    public characterName: string = 'darko';
    public damageMultiplier: number = CHARACTER_STATS.darko_1993.hitDamage / 12;

    public isAttacking: boolean = false;
    public isDead: boolean = false;
    public isJumping: boolean = false;

    // jumpVisualOffset is retained as a public property so the Phaser tween target
    // still compiles. It is NOT used to drive displayOriginY. The tween drives this.y.
    public jumpVisualOffset: number = 0;

    // Ground Y captured at take-off so the tween can restore it exactly on landing.
    private jumpGroundY: number = 0;

    public equippedWeapon: string | null = null;
    public weaponDurability: number = 0;
    public weaponHitsTaken: number = 0;
    private weaponSprite: Phaser.GameObjects.Sprite | null = null;

    private weaponOffsets: Record<string, { x: number, y: number, angle: number }> = {
        'idle':  { x: 30,  y: -110, angle: -15 },
        'walk':  { x: 35,  y: -115, angle:  -5 },
        'run':   { x: 45,  y: -110, angle:  15 },
        'jump':  { x: 25,  y: -120, angle: -30 },
        'shoot': { x: 60,  y: -105, angle:   0 }
    };

    private currentVoice: any = null;
    private walkSpeed: number = CHARACTER_STATS.darko_1993.baseSpeed;
    private runSpeed: number  = CHARACTER_STATS.darko_1993.runSpeed;
    private jumpVelocityX: number = 0;

    private lastKey: string = '';
    private lastKeyTime: number = 0;
    private isRunning: boolean = false;
    private queuedAction: string | null = null;

    // Cached weapon depth to avoid calling setDepth every frame.
    private lastWeaponDepth: number = -1;

    // Timer reference for the pickup tint so it can be cancelled if interrupted.
    private pickupTintTimer: Phaser.Time.TimerEvent | null = null;

    private punchImpacts = ['punch_1','punch_2','punch_3','punch_4','punch_5','punch_6','punch_7','punch_8'];
    private kickImpacts  = ['kick_1','kick_2','kick_3','kick_4'];
    private grunts       = ['grunt_m_1','grunt_m_2','grunt_m_3','grunt_m_4'];
    private agonies      = ['agony_m_1','agony_m_2','agony_m_3','agony_m_4'];
    private specialAudio = ['darko_special_1','darko_special_2','darko-special-smf'];

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
            // Physics body sized and offset ONCE here, never modified in update().
            // Values calibrated for 256×256 source atlas frames at scale 1.7.
            this.body.setSize(50, 30);
            this.body.setOffset(103, 226);
            (this.body as Phaser.Physics.Arcade.Body).setAllowRotation(false);
        }

        this.createAnimations();
    }

    // ─── Helpers ────────────────────────────────────────────────────────────────

    private safeCall(methodName: string, ...args: any[]) {
        if (this.scene && typeof (this.scene as any)[methodName] === 'function') {
            return (this.scene as any)[methodName](...args);
        }
        return null;
    }

    // ─── Animation setup ────────────────────────────────────────────────────────

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

            const matchingFrames = allFrames
                .filter(f => f.includes(`${animKey}/frame_`))
                .sort();
            if (matchingFrames.length === 0) return;

            let fps = 15;
            if      (animType === 'idle')                              fps = 6;
            else if (animType === 'walk' || animType === 'walk-rifle') fps = 12;
            else if (animType === 'run')                               fps = 18;
            else if (animType === 'jump')                              fps = 8;
            else if (animType === 'melee')                             fps = 18;
            else if (animType === 'kick-1' || animType === 'kick-2')   fps = 22;

            const frameConfig = matchingFrames.map(f => ({ key: this.characterName, frame: f }));

            if (animType === 'shoot-with-rifle' && frameConfig.length === 1) {
                frameConfig.push(frameConfig, frameConfig, frameConfig);
            }

            anims.create({
                key: animKey,
                frames: frameConfig,
                frameRate: fps,
                repeat: ['idle','walk','run','walk-rifle'].includes(animType) ? -1 : 0
            });
        });
    }

    // ─── Weapon management ──────────────────────────────────────────────────────

    public equipWeapon(weaponKey: string) {
        if (this.weaponSprite) this.weaponSprite.destroy();
        this.equippedWeapon  = weaponKey;
        this.weaponHitsTaken = 0;
        this.lastWeaponDepth = -1;

        if (weaponKey === 'M70-FINAL rev') {
            this.weaponDurability = 5;
            this.weaponSprite     = null;
        } else {
            this.weaponDurability = 5;
            this.weaponSprite = this.scene.add.sprite(this.x, this.y, weaponKey);
            (this.weaponSprite as any).isWeaponSprite = true;
            this.weaponSprite.setScale(1.3);
            this.weaponSprite.setOrigin(0.5, 0.8);
        }
    }

    private dropAndFadeWeapon() {
        if (!this.equippedWeapon) return;

        const drop = this.scene.add.sprite(this.x, this.y - 150, this.equippedWeapon);
        drop.setScale(this.equippedWeapon === 'M70-FINAL rev' ? 1.0 : 1.3);
        drop.setFlipX(this.flipX);

        this.scene.tweens.add({ targets: drop, x: this.x + (this.flipX ? -80 : 80), duration: 600, ease: 'Linear' });
        this.scene.tweens.add({ targets: drop, y: this.y, angle: 0, duration: 600, ease: 'Bounce.easeOut' });
        this.scene.tweens.add({
            targets: drop, alpha: 0, duration: 150, delay: 1500, yoyo: true, repeat: 4,
            onComplete: () => {
                this.scene.tweens.add({ targets: drop, alpha: 0, duration: 300, onComplete: () => drop.destroy() });
            }
        });

        this.equippedWeapon = null;
        if (this.weaponSprite) { this.weaponSprite.destroy(); this.weaponSprite = null; }
    }

    private positionWeaponSprite() {
        if (!this.weaponSprite || !this.equippedWeapon) return;

        const currentAnimKey   = this.anims.currentAnim?.key.replace(`${this.characterName}-`, '') || 'idle';
        const currentFrameName = this.frame.name;
        const dirX = this.flipX ? -1 : 1;

        if (
            ['special-attack','finish-move','jump-punch','jump-kick','knockdown-get-up'].includes(currentAnimKey) ||
            currentFrameName.includes('pick-up') ||
            this.equippedWeapon === 'M70-FINAL rev'
        ) {
            this.weaponSprite.visible = false;
            return;
        }

        // this.y is the physics/ground anchor. During a jump the tween shifts this.y
        // upward, so the weapon follows the sprite automatically — no extra offset needed.
        let targetX = this.x;
        let targetY = this.y;
        let targetAngle = 0;

        if (currentAnimKey === 'melee') {
            if      (['018','019','020'].some(n => currentFrameName.includes(n))) { targetX += (-30*dirX); targetY -= 120; targetAngle = -30*dirX; }
            else if (['004','005','006'].some(n => currentFrameName.includes(n))) { targetX += (-10*dirX); targetY -= 170; targetAngle =  30*dirX; }
            else if (['021','022','023'].some(n => currentFrameName.includes(n))) { targetX += ( 85*dirX); targetY -= 105; targetAngle =  85*dirX; }
            else if (['028','029','030'].some(n => currentFrameName.includes(n))) { targetX += ( 65*dirX); targetY -=  75; targetAngle = 135*dirX; }
            else                                                                  { targetX += ( 40*dirX); targetY -= 135; targetAngle =  55*dirX; }
        } else if (currentAnimKey === 'throw') {
            if      (['000','001','002','003','004'].some(n => currentFrameName.includes(n)))                                                      { targetX += (-10*dirX); targetY -= 170; targetAngle = -30*dirX; }
            else if (['005','006','007','008','009','010','011','012','013','014','015'].some(n => currentFrameName.includes(n))) { targetX += (-30*dirX); targetY -= 180; targetAngle = -60*dirX; }
            else if (['016','017','018','019'].some(n => currentFrameName.includes(n)))                                                            { targetX += ( 20*dirX); targetY -= 170; targetAngle =  45*dirX; }
            else                                                                                                                                   { targetX += ( 70*dirX); targetY -= 150; targetAngle =  90*dirX; }
        } else {
            const offset = this.weaponOffsets[currentAnimKey] || this.weaponOffsets['idle'];
            targetX += (offset.x * dirX);
            targetY += offset.y;
            targetAngle = offset.angle * dirX;
        }

        this.weaponSprite.setPosition(targetX, targetY);
        this.weaponSprite.setAngle(targetAngle);
        this.weaponSprite.setFlipX(this.flipX);

        const desiredDepth = this.depth + 1;
        if (this.lastWeaponDepth !== desiredDepth) {
            this.weaponSprite.setDepth(desiredDepth);
            this.lastWeaponDepth = desiredDepth;
        }

        this.weaponSprite.visible = true;
    }

    private throwWeapon() {
        if (!this.equippedWeapon) return;
        const dirX = this.flipX ? -1 : 1;
        this.safeCall('spawnProjectile', this.y, this.x + (20*dirX), this.y - 120, this.equippedWeapon, dirX, 50, true);
        this.equippedWeapon = null;
        if (this.weaponSprite) { this.weaponSprite.destroy(); this.weaponSprite = null; }
    }

    // ─── Pickup flash ────────────────────────────────────────────────────────────

    public playPickupAnim() {
        if (this.isDead || this.isJumping || this.isAttacking) return;
        this.isAttacking = true;
        this.setVelocity(0, 0);
        this.anims.stop();
        this.setFrame('darko-pick-up/frame_002.png');

        // Cancel any in-flight tint timer before applying a new one.
        if (this.pickupTintTimer) { this.pickupTintTimer.remove(); this.pickupTintTimer = null; }
        this.clearTint();
        // setTint = multiplicative colour tint (sprite texture still visible).
        this.setTint(0x39ff14);
        this.pickupTintTimer = this.scene.time.delayedCall(120, () => {
            this.clearTint();
            this.pickupTintTimer = null;
        });

        this.scene.time.delayedCall(300, () => { this.isAttacking = false; });
    }

    // ─── Main update ─────────────────────────────────────────────────────────────

    public update(input: any) {
        if (this.isDead) return;

        this.setAngle(0);

        // Scale is always 1.7 — no per-frame branching on frame name.
        this.setScale(1.7);

        // Origin is always (0.5, 1) — anchored bottom-centre.
        this.setOrigin(0.5, 1);

        this.positionWeaponSprite();

        // ── Jump ────────────────────────────────────────────────────────────────
        if (input.space && !this.isJumping && !this.isAttacking) {
            this.isJumping   = true;
            this.jumpGroundY = this.y;

            if      (input.left)  this.jumpVelocityX = -this.runSpeed * 1.2;
            else if (input.right) this.jumpVelocityX  =  this.runSpeed * 1.2;
            else                  this.jumpVelocityX  =  0;

            if (this.scene.anims.exists(`${this.characterName}-jump`)) {
                this.play(`${this.characterName}-jump`, true);
            }

            // CRITICAL: Disable physics collision during jump so moving this.y 
            // completely outside the road belt doesn't cause the physics engine 
            // to delete/cull Darko.
            if (this.body) (this.body as Phaser.Physics.Arcade.Body).collideWorldBounds = false;

            this.scene.tweens.add({
                targets: this,
                y: this.jumpGroundY - 220,
                duration: 400,
                yoyo: true,
                ease: 'Quad.easeOut',
                onComplete: () => {
                    this.isJumping        = false;
                    this.jumpVisualOffset = 0;
                    this.y                = this.jumpGroundY; // snap to exact ground Y
                    
                    if (this.body) (this.body as Phaser.Physics.Arcade.Body).collideWorldBounds = true;

                    if (!this.isAttacking && this.scene.anims.exists(`${this.characterName}-idle`)) {
                        this.play(`${this.characterName}-idle`, true);
                    }
                }
            });
        }

        // ── Double-tap run detection ─────────────────────────────────────────────
        const now = this.scene.time.now;
        if (input.left || input.right) {
            const dir = input.left ? 'left' : 'right';
            if (this.lastKey !== dir) {
                if (now - this.lastKeyTime < 250) this.isRunning = true;
                this.lastKey     = dir;
                this.lastKeyTime = now;
            }
        } else {
            this.isRunning = false;
            this.lastKey   = '';
        }

        // ── Action input ─────────────────────────────────────────────────────────
        let requestedAction: string | null = null;
        if      (input.special)  requestedAction = 'special';
        else if (input.finisher) requestedAction = 'finisher';
        else if (input.p1)       requestedAction = 'punch-1';
        else if (input.p2)       requestedAction = 'punch-2';
        else if (input.k1)       requestedAction = 'kick-1';
        else if (input.k2)       requestedAction = 'kick-2';

        if (requestedAction) {
            if (this.isJumping && !this.isAttacking) {
                if (requestedAction.includes('punch') || requestedAction.includes('kick')) {
                    this.executeJumpAttack(requestedAction);
                }
            } else if (!this.isJumping) {
                if (!this.isAttacking) {
                    if (this.equippedWeapon && (requestedAction === 'punch-1' || requestedAction === 'punch-2')) {
                        this.executeWeaponAttack();
                    } else {
                        this.executeAction(requestedAction);
                    }
                } else {
                    if (requestedAction !== 'special' && requestedAction !== 'finisher') {
                        this.queuedAction = requestedAction;
                    }
                }
            }
            return;
        }

        // ── Movement ─────────────────────────────────────────────────────────────
        if (!this.isAttacking) {
            let vx = 0, vy = 0;

            if (this.isJumping) {
                vx = this.jumpVelocityX;
            } else {
                const speed = this.isRunning ? this.runSpeed : this.walkSpeed;
                vx = input.left ? -speed : (input.right ? speed : 0);
                vy = input.up   ? -speed * 0.6 : (input.down ? speed * 0.6 : 0);
            }

            this.setVelocity(vx, vy);
            if (vx !== 0) this.setFlipX(vx < 0);

            if (!this.isJumping) {
                if (vx !== 0 || vy !== 0) {
                    if (this.isRunning) {
                        this.play(`${this.characterName}-run`, true);
                    } else if (this.equippedWeapon === 'M70-FINAL rev') {
                        const rifleWalk = `${this.characterName}-walk-rifle`;
                        this.play(this.scene.anims.exists(rifleWalk) ? rifleWalk : `${this.characterName}-walk`, true);
                    } else {
                        this.play(`${this.characterName}-walk`, true);
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
            if (this.isJumping) this.setVelocity(this.jumpVelocityX, 0);
        }
    }

    // ─── Attack execution ────────────────────────────────────────────────────────

    private executeWeaponAttack() {
        this.isAttacking = true;
        this.setVelocity(0, 0);

        if (this.equippedWeapon === 'M70-FINAL rev') {
            const shootAnim = this.scene.anims.exists(`${this.characterName}-shoot-with-rifle`)
                ? `${this.characterName}-shoot-with-rifle`
                : `${this.characterName}-shoot`;
            if (this.scene.anims.exists(shootAnim)) this.play(shootAnim, true);

            const dirX   = this.flipX ? -1 : 1;
            this.safeCall('playSFX', 'gun-shot-m70', 1.0);

            const spawnX = this.x + (150 * dirX);
            // Raised projectile and muzzle flash height (formerly 230, now 270)
            const spawnY = this.y - 270; 
            this.safeCall('spawnProjectile', this.y, spawnX, spawnY, 'bullet', dirX, 60, false);

            const flash = this.scene.add.sprite(this.x + (170 * dirX), spawnY, 'muzzle-flash-m70');
            flash.setDepth(9999).setFlipX(this.flipX).setScale(1.2).setBlendMode(Phaser.BlendModes.ADD);
            this.scene.tweens.add({ targets: flash, alpha: 0, duration: 100, onComplete: () => flash.destroy() });
            this.scene.cameras.main.shake(100, 0.01);

            this.weaponDurability--;
            if (this.weaponDurability <= 0) {
                this.scene.time.delayedCall(150, () => {
                    this.dropAndFadeWeapon();
                    this.scene.time.delayedCall(300, () => { this.isAttacking = false; });
                });
            } else {
                this.scene.time.delayedCall(300, () => { this.isAttacking = false; });
            }
        } else {
            this.weaponDurability--;
            if (this.weaponDurability <= 0) {
                this.scene.time.delayedCall(100, () => this.dropAndFadeWeapon());
                this.play(`${this.characterName}-punch-2`, true);
                this.once('animationcomplete', () => { this.isAttacking = false; });
                return;
            }

            const animToPlay = this.scene.anims.exists(`${this.characterName}-melee`)
                ? `${this.characterName}-melee`
                : `${this.characterName}-punch-2`;
            this.play(animToPlay, true);

            const hitZone = this.scene.add.zone(this.x + (this.flipX ? -80 : 80), this.y - 60, 160, 100);
            this.scene.physics.add.existing(hitZone);
            let hasHit = false;

            this.scene.physics.add.overlap(hitZone, [(this.scene as any).enemies, (this.scene as any).breakables], (_hz, target: any) => {
                if (Math.abs(this.y - target.y) <= (target.isBreakable ? 140 : 60)) {
                    if (!hasHit) { this.safeCall('playSFX', ['punch_4','punch_5']); hasHit = true; }
                    this.safeCall('spawnBlood', (this.x + target.x) / 2, target.y - 50);
                    if (target.takeDamage) target.takeDamage(25 * this.damageMultiplier);
                    if (hitZone.body) (hitZone.body as Phaser.Physics.Arcade.Body).enable = false;
                }
            });

            this.once('animationcomplete', () => {
                if (hitZone.active) hitZone.destroy();
                this.isAttacking = false;
            });
        }
    }

    private executeJumpAttack(action: string) {
        this.isAttacking = true;
        const type     = action.includes('punch') ? 'jump-punch' : 'jump-kick';
        const animKey  = `${this.characterName}-${type}`;
        const fallback = `${this.characterName}-kick-1`;
        if      (this.scene.anims.exists(animKey))  this.play(animKey,  true);
        else if (this.scene.anims.exists(fallback))  this.play(fallback, true);

        // IMPORTANT: Because Darko's physical Y moves during the jump, we MUST use jumpGroundY
        // as the origin for the hitbox overlay, otherwise his kicks will literally miss enemies
        // directly beneath him!
        const baseY = this.isJumping ? this.jumpGroundY : this.y;

        const hitZone = this.scene.add.zone(this.x + (this.flipX ? -60 : 60), baseY - 100, 140, 90);
        this.scene.physics.add.existing(hitZone);
        let hasHit = false;

        this.scene.physics.add.overlap(hitZone, [(this.scene as any).enemies, (this.scene as any).breakables], (_hz, target: any) => {
            if (Math.abs(baseY - target.y) <= (target.isBreakable ? 140 : 60)) {
                if (!hasHit) { this.safeCall('playSFX', action.includes('punch') ? this.punchImpacts : this.kickImpacts); hasHit = true; }
                this.safeCall('spawnHitEffect', (this.x + target.x) / 2, target.y - 80);
                if (target.takeDamage) target.takeDamage(15 * this.damageMultiplier);
                if (hitZone.body) (hitZone.body as Phaser.Physics.Arcade.Body).enable = false;
            }
        });

        this.once('animationcomplete', () => {
            if (hitZone.active) hitZone.destroy();
            this.isAttacking = false;
        });
    }

    private executeAction(action: string) {
        // SMF gate — evaluated before any state mutation.
        if (action === 'special') {
            if (this.smfMeter >= 50) {
                this.smfMeter -= 50;
                this.safeCall('updateReactHUD');
                this.executeDarkoSpecial();
            } else {
                this.executeAction('punch-2');
            }
            return;
        }

        if (action === 'finisher') {
            if (this.smfMeter >= 100) {
                this.smfMeter = 0;
                this.safeCall('updateReactHUD');
                this.executeDarkoFinisher();
            } else {
                this.executeAction('kick-2');
            }
            return;
        }

        this.isAttacking = true;
        this.setVelocity(0, 0);

        const animToPlay = `${this.characterName}-${action}`;
        if (this.scene.anims.exists(animToPlay)) this.play(animToPlay, true);

        const offsetX   = action === 'kick-2' ? 110 : 80;
        const zoneWidth = action === 'kick-2' ? 200 : 140;
        const hitZone = this.scene.add.zone(
            this.x + (this.flipX ? -offsetX : offsetX),
            this.y - 40, zoneWidth, 80
        );
        hitZone.setName('basicAttackZone');
        this.scene.physics.add.existing(hitZone);
        let hasHit = false;

        this.scene.physics.add.overlap(hitZone, [(this.scene as any).enemies, (this.scene as any).breakables], (_hz, target: any) => {
            if (Math.abs(this.y - target.y) <= (target.isBreakable ? 140 : 60)) {
                if (!hasHit) { this.safeCall('playSFX', action.includes('punch') ? this.punchImpacts : this.kickImpacts); hasHit = true; }
                const damage = (action.includes('2') ? 15 : 10) * this.damageMultiplier;
                this.safeCall('spawnHitEffect', (this.x + target.x) / 2, target.y - 50);
                if (target.takeDamage) target.takeDamage(damage);
                if (hitZone.body) (hitZone.body as Phaser.Physics.Arcade.Body).enable = false;
            }
        });

        this.once('animationcomplete', () => {
            if (hitZone.active) hitZone.destroy();
            if (this.queuedAction) {
                const next = this.queuedAction;
                this.queuedAction = null;
                this.isAttacking  = false;
                this.executeAction(next);
            } else {
                this.isAttacking = false;
            }
        });
    }

    private executeDarkoSpecial() {
        this.isAttacking = true;
        this.setVelocity(0, 0);
        const anim = this.scene.anims.exists(`${this.characterName}-special-attack`)
            ? `${this.characterName}-special-attack` : `${this.characterName}-punch-1`;
        if (this.scene.anims.exists(anim)) this.play(anim, true);

        this.scene.time.delayedCall(200, () => {
            // FIX: Special move plays generic punch impacts
            this.safeCall('playSFX', ['punch_4', 'punch_5']);
            this.safeCall('triggerScreenGlitch', 400);
            this.scene.cameras.main.shake(300, 0.015);

            const spinZone = this.scene.add.circle(this.x, this.y - 40, 180);
            this.scene.physics.add.existing(spinZone);

            this.scene.physics.add.overlap(spinZone, [(this.scene as any).enemies, (this.scene as any).breakables], (_sz, target: any) => {
                if (Math.abs(this.y - target.y) <= (target.isBreakable ? 160 : 60)) {
                    const pushDir = target.x > this.x ? 1 : -1;
                    if (target.takeDamage) {
                        target.takeDamage(40 * this.damageMultiplier);
                        if (target.body && target.type !== 'obj_kiosk' && target.type !== 'obj_kontejner') {
                            target.setVelocityX(400 * pushDir);
                        }
                    }
                    this.safeCall('spawnHitEffect', target.x, target.y - 50);
                }
            });

            this.scene.time.delayedCall(200, () => { if (spinZone.active) spinZone.destroy(); });
        });

        this.once('animationcomplete', () => { this.isAttacking = false; });
    }

    private executeDarkoFinisher() {
        this.isAttacking = true;
        this.setVelocity(0, 0);
        const anim = this.scene.anims.exists(`${this.characterName}-finish-move`)
            ? `${this.characterName}-finish-move` : `${this.characterName}-punch-1`;
        if (this.scene.anims.exists(anim)) this.play(anim, true);

        this.scene.time.delayedCall(300, () => {
            // FIX: Finisher now plays the heavy signature SFX array
            this.safeCall('playSFX', this.specialAudio, 1.0);
            this.safeCall('triggerScreenGlitch', 800);
            this.scene.cameras.main.shake(500, 0.03);

            const hitZone = this.scene.add.zone(this.x + (this.flipX ? -150 : 150), this.y - 40, 260, 120);
            this.scene.physics.add.existing(hitZone);

            this.scene.physics.add.overlap(hitZone, [(this.scene as any).enemies, (this.scene as any).breakables], (_hz, target: any) => {
                if (Math.abs(this.y - target.y) <= (target.isBreakable ? 140 : 60)) {
                    if (target.takeDamage) target.takeDamage(80 * this.damageMultiplier);
                    this.safeCall('spawnHitEffect', target.x, target.y - 50);
                    if (hitZone.body) (hitZone.body as Phaser.Physics.Arcade.Body).enable = false;
                }
            });

            this.scene.time.delayedCall(100, () => { if (hitZone.active) hitZone.destroy(); });
        });

        this.once('animationcomplete', () => { this.isAttacking = false; });
    }

    // ─── Damage / death ─────────────────────────────────────────────────────────

    public takeDamage(amount: number) {
        this.health -= amount;
        this.queuedAction = null;
        this.safeCall('spawnHitEffect', this.x, this.y - 40);
        if (this.scene) (this.scene as any).lastPlayerHitTime = Date.now();

        if (this.equippedWeapon) {
            this.weaponHitsTaken++;
            if (this.weaponHitsTaken >= 4) this.dropAndFadeWeapon();
        }

        if (this.health <= 0) {
            this.safeCall('playSFX', this.agonies);
            this.die();
        } else {
            this.safeCall('playSFX', this.grunts);
            // Cancel any pending pickup tint before applying damage tint.
            if (this.pickupTintTimer) { this.pickupTintTimer.remove(); this.pickupTintTimer = null; }
            this.clearTint();

            const dmgAnim = `${this.characterName}-damage`;
            if (this.scene.anims.exists(dmgAnim)) {
                this.isAttacking = true;
                this.setTint(0xff0000);
                this.play(dmgAnim, true);
                this.scene.time.delayedCall(150, () => this.clearTint());
                this.once('animationcomplete', () => { this.isAttacking = false; });
            } else {
                this.setTint(0xff0000);
                this.scene.time.delayedCall(200, () => this.clearTint());
            }
        }
        this.safeCall('updateReactHUD');
    }

    public takeKnockdown(amount: number = 15) {
        this.health -= amount;
        this.queuedAction = null;
        this.safeCall('spawnHitEffect', this.x, this.y - 40);
        if (this.scene) (this.scene as any).lastPlayerHitTime = Date.now();

        if (this.equippedWeapon) this.dropAndFadeWeapon();

        if (this.health <= 0) {
            this.safeCall('playSFX', this.agonies);
            this.die();
        } else {
            this.safeCall('playSFX', this.grunts);
            if (this.pickupTintTimer) { this.pickupTintTimer.remove(); this.pickupTintTimer = null; }
            this.clearTint();

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
        this.safeCall('updateReactHUD');
    }

    private die() {
        this.isDead = true;
        this.setVelocity(0, 0);
        if (this.pickupTintTimer) { this.pickupTintTimer.remove(); this.pickupTintTimer = null; }
        this.clearTint();

        const dieAnim = `${this.characterName}-dying`;
        if (this.scene.anims.exists(dieAnim)) this.play(dieAnim, true);
        else this.setTint(0xff0000);

        if (this.weaponSprite) this.weaponSprite.destroy();
    }
}