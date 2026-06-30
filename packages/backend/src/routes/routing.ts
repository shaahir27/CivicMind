import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireAuthority } from '../middleware/rbac.js';
import { asyncHandler, ValidationError, ApiError } from '../middleware/errorHandler.js';
import type { Request, Response } from 'express';

const router = Router();

router.use(authenticate as any);
router.use(requireAuthority as any);

router.post('/optimize-route', asyncHandler(async (req: Request, res: Response) => {
  const { start_location, waypoints } = req.body as {
    start_location: { lat: number; lng: number };
    waypoints: { id: string; lat: number; lng: number }[];
  };

  if (!start_location || !waypoints || !Array.isArray(waypoints)) {
    throw new ValidationError('start_location and an array of waypoints are required.');
  }

  if (waypoints.length === 0) {
    res.status(200).json({ optimized_route: [] });
    return;
  }

  // Google Maps Directions API URL limit allows ~25 waypoints
  if (waypoints.length > 25) {
    throw new ValidationError('Maximum 25 waypoints allowed for route optimization.');
  }

  const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY;
  if (!apiKey) {
    throw new ApiError(500, 'INTERNAL_ERROR', 'Google Maps API key is not configured on the server.');
  }

  const origin = `${start_location.lat},${start_location.lng}`;
  const destination = origin;

  // Format waypoints: optimize:true|lat,lng|lat,lng
  const waypointsStr = `optimize:true|${waypoints.map(w => `${w.lat},${w.lng}`).join('|')}`;

  const url = new URL('https://maps.googleapis.com/maps/api/directions/json');
  url.searchParams.append('origin', origin);
  url.searchParams.append('destination', destination);
  url.searchParams.append('waypoints', waypointsStr);
  url.searchParams.append('key', apiKey);

  const response = await fetch(url.toString());
  const data = await response.json() as any;

  if (data.status !== 'OK') {
    throw new ApiError(502, 'MAPS_API_ERROR', `Failed to optimize route: ${data.status} - ${data.error_message || ''}`);
  }

  // The `waypoint_order` array in the response tells us the optimal order
  const route = data.routes[0];
  const order = route.waypoint_order as number[];

  const optimized_route = order.map((index: number) => waypoints[index]);

  res.status(200).json({
    optimized_route,
    polyline: route.overview_polyline?.points
  });
}));

export default router;
