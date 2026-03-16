import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
    constructor() { super({ key: 'BootScene' }); }

    preload() {
        // Environments & Effects
        this.load.image('part1_sky', 'assets/images/environments/part1_sky.png');
        this.load.image('part1_mid', 'assets/images/environments/part1_mid.png');
        this.load.image('part1_floor', 'assets/images/environments/part1_floor.png');
        this.load.image('explosion_01', 'assets/images/environments/explosion_01.png');

        // Items (Health Pickups)
        this.load.image('item-burek', 'assets/images/environments/item-burek.png');
        this.load.image('item-coffee', 'assets/images/environments/item-coffee.png');
        this.load.image('item-pork', 'assets/images/environments/item-pork.png');
        this.load.image('item-beer', 'assets/images/environments/item-beer.png');
        this.load.image('item-sandwich', 'assets/images/environments/item-sandwich.png');

        // Atlases
        this.load.atlas('marko', 'assets/sprites/marko.png', 'assets/sprites/marko.json');
        this.load.atlas('maja', 'assets/sprites/maja.png', 'assets/sprites/maja.json');
        this.load.atlas('darko', 'assets/sprites/darko.png', 'assets/sprites/darko.json');
        this.load.atlas('enemies_1993', 'assets/sprites/enemies_1993.png', 'assets/sprites/enemies_1993.json');

        // Audio
        this.load.audioSprite('sfx_atlas', 'assets/audio/sfx_atlas.json', ['assets/audio/sfx_atlas.mp3']);
    }

    create() {
        this.createPlayerAnimations();
        this.createEnemyAnimations();

        const selected = this.game.canvas.parentElement?.getAttribute('data-selected-character') || 'marko';
        this.registry.set('selectedCharacter', selected);
        this.scene.start('MainLevel');
    }

    private createPlayerAnimations() {
        const characters = ['marko', 'maja', 'darko'];
        const actionMap = { 
            'idle': 'idle', 'walk': 'walk', 'run': 'run', 
            'punch-1': 'punch-1', 'punch-2': 'punch-2', 'kick-1': 'kick-1', 'kick-2': 'kick-2', 
            'damage': 'damage', 'die': 'knockdown', 'special': 'special', 'finisher': 'finisher' 
        };

        characters.forEach(char => {
            Object.entries(actionMap).forEach(([actionKey, folderName]) => {
                const animKey = `${char}-${actionKey}`; 
                const framePrefix = `${char}-${folderName}/frame_`;
                const fps = ['punch-1', 'punch-2', 'kick-1', 'kick-2', 'special', 'finisher'].includes(actionKey) ? 15 : 10;
                const isLoop = ['idle', 'walk', 'run'].includes(actionKey);
                this.createAutoAnimation(char, animKey, framePrefix, isLoop, fps);
            });
            this.createFallbackAnimation(`${char}-special`, `${char}-special_attack`);
            this.createFallbackAnimation(`${char}-finisher`, `${char}-finish_move`);
        });
    }

    private createEnemyAnimations() {
        const enemyTypes = ['mup', 'dizel', 'dizelcic', 'rudar', 'sloba'];
        const actions = ['idle', 'walk', 'punch-1', 'punch-2', 'damage', 'dying'];
        
        enemyTypes.forEach(type => {
            actions.forEach(action => {
                const key = `${type}-${action}`;
                this.createAutoAnimation('enemies_1993', key, `${key}/frame_`, ['idle', 'walk'].includes(action), 10);
            });
        });
    }

    private createAutoAnimation(atlasKey: string, animKey: string, framePrefix: string, isLooping: boolean, fps: number) {
        const texture = this.textures.get(atlasKey);
        const frames: Phaser.Types.Animations.AnimationFrame[] = [];
        for (let i = 0; i <= 60; i++) {
            const frameName = `${framePrefix}${i.toString().padStart(3, '0')}.png`;
            if (texture.has(frameName)) frames.push({ key: atlasKey, frame: frameName });
        }
        if (frames.length > 0) this.anims.create({ key: animKey, frames, frameRate: fps, repeat: isLooping ? -1 : 0 });
    }

    private createFallbackAnimation(newKey: string, sourceKey: string) {
        if (!this.anims.exists(newKey) && this.anims.exists(sourceKey)) {
            const sourceAnim = this.anims.get(sourceKey);
            const frameConfig = sourceAnim.frames.map(f => ({ key: f.textureKey, frame: f.textureFrame }));
            this.anims.create({ key: newKey, frames: frameConfig, frameRate: sourceAnim.frameRate, repeat: sourceAnim.repeat ? -1 : 0 });
        }
    }
}