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
};

export function getModelMetadata(meshName: string): ModelMetadata | undefined {
  if (MODELS_MAPPER[meshName]) {
    return MODELS_MAPPER[meshName];
  }
  const baseKey = Object.keys(MODELS_MAPPER).find((key) => meshName.startsWith(key));
  return baseKey ? MODELS_MAPPER[baseKey] : undefined;
}
