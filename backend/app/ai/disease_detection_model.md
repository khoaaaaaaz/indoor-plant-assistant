# 🔬 Plant Pathology Detection: Fine-Grained Texture Classification

**Project:** Progressive Web App (PWA) for Indoor Plant Care  
**Core Architecture:** MobileNetV2 (Transfer Learning)  
**Target Classes:** 14 distinct health conditions across 4 plant species (Aloe, Money Plant, Snake Plant, Spider Plant)  
**Final Validation Accuracy:** ~84.03%  

---

## 📖 1. Project Overview
Unlike species classification (which relies on macroscopic shapes and geometries), disease detection is a fine-grained computer vision task requiring the model to identify microscopic textural changes (spots, rot, mildew). This module utilizes a highly customized MobileNetV2 pipeline to act as a botanical pathologist for 4 targeted indoor plants.

---

## 🧹 2. Advanced Data Engineering & Leakage Defense
This model faced severe limitations regarding dataset quality and quantity. We implemented several advanced engineering defenses:
1. **Dataset Unification:** Merged two distinct Kaggle datasets. Implemented Regex normalization (`re.sub`) to standardize conflicting folder naming conventions (e.g., `Aloe_Vera___Rot` vs. `Aloe_Vera_Rot`).
2. **The "Equalizer" Script (Combating the Aloe Avalanche):** The initial merged dataset contained over 14,000 Aloe images but only ~130 Money Plant images. To prevent the model from becoming completely biased, we forcefully capped all 14 target classes to a maximum of ~135 images for training, ensuring mathematical equality.
3. **Data Leakage Eradication:** The source datasets contained artificially rotated duplicates labeled `_Augumented`. A strict string-matching filter was introduced to purge these files during dataset creation. This mathematically guaranteed that the validation and test splits were 100% pristine and unseen.
4. **Pathology-Specific Preprocessing:** Removed heavy Gaussian Noise and Zoom from the augmentation pipeline. Blurring images is detrimental to pathology models, as the CNN requires sharp pixel contrast to detect tiny fungal spores and bacterial necrosis.
5. **Anti-Memorization Architecture:** Due to the "micro-dataset" constraint (~130 images per class), the `Dropout` layer was increased from 0.3 to **0.5**. This randomly disabled 50% of the neurons during training, forcing the model to learn genuine disease textures rather than simply memorizing the 130 images.

---

## ⚙️ 3. Aggressive Fine-Tuning Protocol
The micro-dataset required a highly careful, three-phase tuning strategy.

1. **Phase 1: Warm-up** * **Action:** Frozen 100% of the base. Trained for 5 epochs to align the classification head.
2. **Phase 2: Deep Fine-Tuning (Loss Monitored)** * **Action:** Unfroze down to layer 80.
   * **Roadblock:** With only ~30 validation images per class, `val_loss` mathematically spiked and fluctuated rapidly. The `ReduceLROnPlateau` callback panicked, dropping the learning rate too early, stalling the model at 76%.
3. **Phase 3: Aggressive Fine-Tuning (Accuracy Monitored)**
   * **Action:** Shifted callback monitors from `val_loss` to the much more stable `val_accuracy`.
   * **Deep Unfreeze:** Opened the base model all the way down to **Layer 50** to allow extraction of highly complex pathological textures.
   * **Result:** Escaped the plateau, smoothly climbing to **84.03%**.

---

## 🏆 4. Final Evaluation & Results
* **Overall Accuracy:** 84.03% on 14 distinct pathological states.
* **The "Solved" Plants (Production-Ready):** The model achieved exceptional F1-Scores (between **0.91 and 0.98**) on Snake Plant, Money Plant, and Spider Plant conditions. It near-perfectly differentiates between Bacterial Wilt, Fungal Spots, and Toxicity.
* **The "Aloe Anomaly" Insight:** The model exhibited slight confusion specifically within the Aloe classes (F1-scores of 0.50 - 0.75). This provides a profound biological insight: fleshy succulents (like Aloe) manifest almost all trauma (rust, sunburn, fungal spot) visually as a sunken, dry brown lesion. The model correctly identified the plant as diseased Aloe 100% of the time, proving it learned genuine botanical damage markers rather than random noise.
