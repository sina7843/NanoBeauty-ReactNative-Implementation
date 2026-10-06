import { Redirect } from 'expo-router';
import { OLD_LINK_HREF } from '../navigation/routes';

/** Unknown or old deep links never dead-end: Home with the "Link not found" note (LEG 07, HOM-01 oldlink). */
export default function NotFound() {
  return <Redirect href={OLD_LINK_HREF} />;
}
