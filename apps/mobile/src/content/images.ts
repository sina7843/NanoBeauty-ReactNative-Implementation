import type { ImageSourcePropType } from 'react-native';

// Clinic photography approved for design (D23), bundled because media storage arrives with STF-36 (NANO-07).
// Content refers to these by key; unknown keys fall back to the labelled PhotoFrame placeholder.
// Rights and team consent are still to be confirmed by the clinic (R07): team photos are only used when the
// server says profile consent is on file.
const IMAGES: Record<string, ImageSourcePropType> = {
  'clinic-interior': require('../../assets/imagery/clinic-interior.webp'),
  'clinic-treatment-room': require('../../assets/imagery/clinic-treatment-room.webp'),
  'team-anna': require('../../assets/imagery/team-anna.webp'),
  'team-maria': require('../../assets/imagery/team-maria.webp'),
  'team-naz': require('../../assets/imagery/team-naz.webp'),
  'treatment-facial': require('../../assets/imagery/treatment-facial.webp'),
  'treatment-hifu': require('../../assets/imagery/treatment-hifu.webp'),
  'treatment-laser': require('../../assets/imagery/treatment-laser.webp'),
  'treatment-prp': require('../../assets/imagery/treatment-prp.webp'),
};

export function imageFor(key: string | null | undefined): ImageSourcePropType | undefined {
  return key ? IMAGES[key] : undefined;
}
