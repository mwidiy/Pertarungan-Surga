import * as THREE from 'three';

/**
 * Komponen CameraManager yang telah ditingkatkan.
 * Mengelola semua perilaku kamera, termasuk:
 * - Dynamic Third-Person Follow & Orbit Camera
 * - First-Person Camera
 * - Smoothing (Gerakan Halus)
 * - Kontrol menggunakan mouse DAN GAMEPAD untuk orbit.
 */
export class CameraManager {
    /**
     * Membuat instance CameraManager.
     * @param {THREE.PerspectiveCamera} camera - Objek kamera yang akan dikontrol.
     * @param {THREE.Mesh} target - Mesh dari objek yang akan diikuti (misal, player.mesh).
     * @param {HTMLElement} domElement - Elemen canvas/DOM untuk event listener mouse.
     * @param {PlayerControls} playerControls - Instance dari PlayerControls untuk input gamepad.
     */
    constructor(camera, target, domElement, playerControls) {
        // Properti Esensial
        this.camera = camera;
        this.target = target;
        this.domElement = domElement || document.body;
        this.playerControls = playerControls; // BARU: Simpan referensi ke playerControls

        // Mode Kamera
        this.modes = {
            THIRD_PERSON: 'third_person',
            FIRST_PERSON: 'first_person'
        };
        this.currentMode = this.modes.THIRD_PERSON;

        // Properti untuk kontrol orbit
        this.spherical = new THREE.Spherical(15, Math.PI / 2.5, Math.PI); // (radius, phi, theta)
        this.mouseSensitivity = 0.005;
        this.gamepadSensitivity = 2.5; // BARU: Sensitivitas untuk stik analog
        this.isMouseDown = false;
        
        // Pivot point kamera sedikit di atas pusat target
        this.pivotPoint = new THREE.Vector3();
        this.targetLookAtOffset = new THREE.Vector3(0, 1.5, 0);

        // Pengaturan First-Person
        this.firstPersonOffset = new THREE.Vector3(0, 1.6, 0.2);

        // Smoothing factor
        this.smoothing = 0.08;

        // Menyiapkan semua event listener
        this._initEventListeners();
    }

    /**
     * Inisialisasi semua event listener yang dibutuhkan.
     * @private
     */
    _initEventListeners() {
        // Listener untuk switch mode kamera (tidak berubah)
        window.addEventListener('keydown', (event) => {
            if (event.key.toLowerCase() === 'c') {
                this.switchMode();
            }
        });

        // Listener untuk kontrol orbit mouse (tidak berubah)
        this.domElement.addEventListener('mousedown', () => {
            this.isMouseDown = true;
        });
        window.addEventListener('mouseup', () => {
            this.isMouseDown = false;
        });
        window.addEventListener('mousemove', (event) => {
            if (!this.isMouseDown || this.currentMode !== this.modes.THIRD_PERSON) {
                return;
            }
            this.spherical.theta -= event.movementX * this.mouseSensitivity;
            this.spherical.phi -= event.movementY * this.mouseSensitivity;
            this.spherical.phi = Math.max(0.1, Math.min(Math.PI / 2, this.spherical.phi));
        });
    }

    /**
     * Beralih antara mode Third-Person dan First-Person.
     */
    switchMode() {
        this.currentMode = (this.currentMode === this.modes.THIRD_PERSON)
            ? this.modes.FIRST_PERSON
            : this.modes.THIRD_PERSON;
        console.log(`Camera mode switched to: ${this.currentMode}`);
    }

    /**
     * Metode update yang dipanggil di setiap frame dari game loop.
     * @param {number} deltaTime - Waktu sejak frame terakhir.
     */
    update(deltaTime) {
        // --- FITUR BARU: KONTROL KAMERA DENGAN GAMEPAD ---
        if (this.playerControls && this.currentMode === this.modes.THIRD_PERSON) {
            const lookInput = this.playerControls.state.look;

            // Update sudut spherical berdasarkan input stik kanan
            this.spherical.theta -= lookInput.x * this.gamepadSensitivity * deltaTime;
            this.spherical.phi -= lookInput.y * this.gamepadSensitivity * deltaTime;

            // Batasi sudut vertikal (phi) agar kamera tidak terbalik
            this.spherical.phi = Math.max(0.1, Math.min(Math.PI / 2, this.spherical.phi));
        }
        // --- AKHIR DARI FITUR BARU ---

        // Tentukan pivot point (pusat orbit) berdasarkan posisi target
        this.pivotPoint.copy(this.target.position).add(this.targetLookAtOffset);

        if (this.currentMode === this.modes.THIRD_PERSON) {
            // Logika orbit dan follow (tidak berubah)
            const desiredCameraPosition = new THREE.Vector3();
            desiredCameraPosition.setFromSpherical(this.spherical);
            desiredCameraPosition.add(this.pivotPoint);
            
            this.camera.position.lerp(desiredCameraPosition, this.smoothing);
            this.camera.lookAt(this.pivotPoint);

        } else if (this.currentMode === this.modes.FIRST_PERSON) {
            // Logika First-Person (tidak berubah)
            const cameraPosition = this.target.localToWorld(this.firstPersonOffset.clone());
            this.camera.position.copy(cameraPosition);

            const lookAtTarget = new THREE.Vector3();
            this.target.getWorldDirection(lookAtTarget);
            lookAtTarget.add(this.camera.position);
            
            this.camera.lookAt(lookAtTarget);
        }
    }
}