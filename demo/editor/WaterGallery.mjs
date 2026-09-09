import { Script } from 'playcanvas';
import { mountGallery } from '../main.js';
import page from '../../index.html?raw';

/** The gallery application, separate from the reusable water and atmosphere components. */
export class WaterGallery extends Script {
    static scriptName = 'waterGallery';

    /**
     * @attribute
     * @type {Entity}
     */
    cameraEntity;

    /**
     * @attribute
     * @type {Entity}
     */
    sunEntity;

    /**
     * Root URL of the published demo assets, ending in a slash.
     * @attribute
     * @type {string}
     */
    assetRoot = 'https://marklundin.github.io/water/';

    /**
     * Initial study: stillwater, open-water, golden-hour, shallows, beneath, caustics, weather, adrift or blue-hour.
     * @attribute
     * @type {string}
     */
    study = 'stillwater';

    initialize() {
        // Runs inside the Editor's existing application and canvas. No iframe or second engine.
        // The coast, bathymetry and material maps use the same published files as the website.
        const template = new DOMParser().parseFromString(page, 'text/html');
        template.querySelectorAll('canvas, script').forEach(element => element.remove());
        template.querySelector('a[href="./demo/sky.html"]').href = `${this.assetRoot}demo/sky.html`;
        const style = document.createElement('style');
        style.textContent = template.querySelector('style').textContent;
        document.head.append(style);
        const overlay = document.createElement('div');
        overlay.id = 'water-gallery';
        overlay.innerHTML = template.body.innerHTML;
        document.body.append(overlay);
        document.body.classList.add('cinematic');
        const query = new URLSearchParams(location.search);
        if (!query.has('shot')) query.set('shot', this.study);
        this.ready = mountGallery({
            app: this.app,
            cameraEntity: this.cameraEntity,
            sunEntity: this.sunEntity,
            baseUrl: this.assetRoot.replace(/\/?$/, '/'),
            query: query.toString()
        }).then(gallery => {
            this.gallery = gallery;
            this.fire('gallery:ready', gallery);
            return gallery;
        }).catch(error => {
            console.error(error);
            const box = overlay.querySelector('#err');
            box.style.display = 'block';
            box.textContent = error.stack || String(error);
            overlay.querySelector('#loader')?.remove();
        });
        this.app.once('destroy', () => { overlay.remove(); style.remove(); });
    }
}
