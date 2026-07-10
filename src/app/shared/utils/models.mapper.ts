export interface ModelMetadata {
  labelKey: string;
  descriptionKey: string;
}

export const availableTextures = [
  'Cadeira',
  'Cama',
  'Carpete',
  'CarpeteH',
  'Chao',
  'Crocs',
  'Estante',
  'Mesa',
  'Monitor',
  'Mouse',
  'Paredes',
  'Porta',
  'Rj45',
  'Roteador',
  'Xbox_One',
];

export const MODELS_MAPPER: Record<string, ModelMetadata> = {
  Dva_Mecha: {
    labelKey: 'interactive.mecha.title',
    descriptionKey: 'interactive.mecha.desc',
  },
  Ice: {
    labelKey: 'interactive.ice.title',
    descriptionKey: 'interactive.ice.desc',
  },
  Charger: {
    labelKey: 'interactive.charger.title',
    descriptionKey: 'interactive.charger.desc',
  },
  Lava_Lamp: {
    labelKey: 'interactive.lava_lamp.title',
    descriptionKey: 'interactive.lava_lamp.desc',
  },

  Rose_Sword: {
    labelKey: 'interactive.rose_sword.title',
    descriptionKey: 'interactive.rose_sword.desc',
  },

  Fifine_K668: {
    labelKey: 'interactive.fifine_k668.title',
    descriptionKey: 'interactive.fifine_k668.desc',
  },

  Sony_A3: {
    labelKey: 'interactive.sony_a3.title',
    descriptionKey: 'interactive.sony_a3.desc',
  },

  PS2: {
    labelKey: 'interactive.ps2.title',
    descriptionKey: 'interactive.ps2.desc',
  },
};

export function getModelMetadata(meshName: string): ModelMetadata | undefined {
  if (MODELS_MAPPER[meshName]) {
    return MODELS_MAPPER[meshName];
  }
  const baseKey = Object.keys(MODELS_MAPPER).find((key) => meshName.startsWith(key));
  return baseKey ? MODELS_MAPPER[baseKey] : undefined;
}
