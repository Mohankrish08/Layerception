import os
import numpy as np
import json
from tensorflow.keras.models import Model
from tensorflow.keras.layers import Conv2D, MaxPooling2D, Flatten, Dense, Dropout, Input, Rescaling
from tensorflow.keras.preprocessing import image
from tensorflow.data import Dataset
from featureViz import FeatureMapVisualizer

def load_images_from_folder(folder):
    image_arrays, labels = [], []
    for i, file in enumerate(os.listdir(folder)):
        if file.lower().endswith(('jpg', 'jpeg', 'png')):
            img_path = os.path.join(folder, file)
            img = image.load_img(img_path, target_size=(28,28))
            img_array = image.img_to_array(img) / 255.0
            image_arrays.append(img_array)
            labels.append(1 if 'cat' in file.lower() else 0)  # dummy binary label
    return np.array(image_arrays), np.array(labels)

def create_model(data):
    length = len(data['layers'])
    input_layer = Input(shape=tuple(data['input_shape']), name="input_layer")
    x = Rescaling(1./255, name="rescaling")(input_layer)
    
    layer_names = []

    for i in range(1, length):
        layer = data['layers'][i]
        if layer['layer'] == 'Conv2D':
            name = f"conv2d_{i}"
            x = Conv2D(layer['filters'], layer['kernel_size'], activation=layer['activation'], name=name)(x)
            layer_names.append(name)
        elif layer['layer'] == 'MaxPooling2D':
            name = f"max_pooling2d_{i}"
            x = MaxPooling2D(layer['pool_size'], name=name)(x)
            layer_names.append(name)
        elif layer['layer'] == 'Flatten':
            name = f"flatten"
            x = Flatten(name=name)(x)
            layer_names.append(name)
        elif layer['layer'] == 'Dense':
            name = f"dense_{i}"
            x = Dense(layer['units'], activation=layer['activation'], name=name)(x)
            layer_names.append(name)
        elif layer['layer'] == 'Dropout':
            name = f"dropout_{i}"
            x = Dropout(layer['rate'], name=name)(x)
            layer_names.append(name)

    model = Model(inputs=input_layer, outputs=x)
    return model, layer_names


# Main logic
if __name__ == "__main__":
    image_dir = './image'
    X, y = load_images_from_folder(image_dir)
    print(X)
    print("--" * 20)
    print(y)

    # Create dataset
    dataset = Dataset.from_tensor_slices((X, y)).batch(len(X))  # entire batch at once

    # Create model
    with open('./test.json', 'r') as f:
        data = json.load(f)
    model, layer_names = create_model(data)
    model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])

    # Feature map logger
    feature_logger = FeatureMapVisualizer(layer_names, validation_data=dataset)

    # Train the model for N epochs
    model.fit(X, y, epochs=5, callbacks=[feature_logger]) 
