import os
import numpy as np
import matplotlib.pyplot as plt
from tensorflow.keras.models import Model
from tensorflow.keras.callbacks import Callback
from supabaseConfig import upload_file
from PIL import Image
from io import BytesIO

class FeatureMapVisualizer(Callback):
    def __init__(self, layer_names, validation_data, output_dir='feature_maps'):
        super().__init__()
        self.layer_names = layer_names
        self.validation_data = validation_data
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    def on_train_begin(self, logs=None):
        self.layer_outputs = [self.model.get_layer(name).output for name in self.layer_names]
        self.activation_model = Model(inputs=self.model.input, outputs=self.layer_outputs)

    def on_epoch_end(self, epoch, logs=None):
        images, _ = next(iter(self.validation_data))
        activations = self.activation_model.predict(images)
        batch_size = images.shape[0]

        for img_idx in range(batch_size):
            #image_dir = os.path.join(self.output_dir, f'epoch_{epoch+1}', f'image_{img_idx+1}')
            #os.makedirs(image_dir, exist_ok=True)

            for layer_name, activation_map in zip(self.layer_names, activations):
                act = activation_map[img_idx]
                print(f"Layer: {layer_name}, Shape: {act.shape}")
                

                if len(act.shape) != 3:
                    print(f"Skipping layer {layer_name} due to incompatible shape.")
                    continue

                n_features = act.shape[-1]
                size = act.shape[1]
                display_grid = np.zeros((size, size * min(n_features, 16)))

                for i in range(min(n_features, 16)):
                    x = act[:, :, i]
                    x -= x.mean()
                    x /= (x.std() + 1e-5)
                    x *= 64
                    x += 128
                    x = np.clip(x, 0, 255).astype('uint8')
                    display_grid[:, i * size:(i + 1) * size] = x

            img = Image.fromarray(display_grid.astype(np.uint8))
            buf = BytesIO()
            img.save(buf, format="PNG")
            buf.seek(0)
            print("layer: ", img_idx)


            path = f"layer_proj/epoch_{epoch+1}/image_{img_idx+1}.png" 
            upload_file('layerception', buf.read(), path)

