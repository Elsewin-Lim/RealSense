"""Optional custom layers for models saved with small ViT-style helper layers.

If your trained model uses a custom Keras layer, define it here and add it to
CUSTOM_OBJECTS in predict.py. Many models saved as .keras will load without this.
"""

import tensorflow as tf


@tf.keras.utils.register_keras_serializable(package="DeepfakeApp")
class AddPositionEmbedding(tf.keras.layers.Layer):
    """Adds learnable position embeddings to input tokens.

    Commonly used in Vision Transformer (ViT) models where input tokens
    are reshaped into a sequence with positional information.
    """

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    def build(self, input_shape):
        seq_len = input_shape[1]
        embed_dim = input_shape[-1]
        self.position_embeddings = self.add_weight(
            name="position_embeddings",
            shape=(1, seq_len, embed_dim),
            initializer="glorot_uniform",
            trainable=True,
        )

    def call(self, inputs):
        return inputs + self.position_embeddings

    def get_config(self):
        config = super().get_config()
        return config


@tf.keras.utils.register_keras_serializable(package="DeepfakeApp")
class ClassToken(tf.keras.layers.Layer):
    """Adds a learnable [CLS] token before transformer tokens.

    This supports a common EfficientNet + ViT model design where the CNN feature
    map is reshaped into tokens and a class token is used for classification.
    """

    def build(self, input_shape):
        embed_dim = int(input_shape[-1])
        self.cls = self.add_weight(
            name="cls",
            shape=(1, 1, embed_dim),
            initializer="zeros",
            trainable=True,
        )

    def call(self, inputs):
        batch_size = tf.shape(inputs)[0]
        cls_tokens = tf.repeat(self.cls, repeats=batch_size, axis=0)
        return tf.concat([cls_tokens, inputs], axis=1)

    def get_config(self):
        return super().get_config()
