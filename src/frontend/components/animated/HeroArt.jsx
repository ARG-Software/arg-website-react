import { useState } from 'react';
import { PearlBlobArt } from './PearlBlobArt';
import { GlowCoreArt } from './GlowCoreArt';
import { MergingDropsArt } from './MergingDropsArt';
import { RisingDropsArt } from './RisingDropsArt';
import { DrippingDropArt } from './DrippingDropArt';

const ARTS = [PearlBlobArt, GlowCoreArt, MergingDropsArt, RisingDropsArt, DrippingDropArt];

// One of the fluid pieces, picked at random each time a page header mounts
export function HeroArt({ className }) {
  const [Art] = useState(() => ARTS[Math.floor(Math.random() * ARTS.length)]);
  return <Art className={className} />;
}
