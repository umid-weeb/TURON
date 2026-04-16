import { FastifyReply, FastifyRequest } from 'fastify';
import { YandexMapsService } from '../../../services/yandex-maps.service.js';

function serializePoint(point: { latitude: number; longitude: number }) {
  return {
    lat: Number(point.latitude),
    lng: Number(point.longitude),
  };
}

export async function handleSuggestAddresses(
  request: FastifyRequest<{
    Querystring: {
      text: string;
      results?: number;
      latitude?: number;
      longitude?: number;
    };
  }>,
  reply: FastifyReply,
) {
  try {
    const { text, results, latitude, longitude } = request.query;

    const suggestions = await YandexMapsService.suggestAddresses(text, {
      results,
      biasPoint:
        typeof latitude === 'number' && typeof longitude === 'number'
          ? { latitude, longitude }
          : undefined,
    });

    return reply.send(
      suggestions.map((item) => ({
        id: item.id,
        title: item.title,
        subtitle: item.subtitle,
        address: item.address,
        uri: item.uri,
        pin: item.pin ? serializePoint(item.pin) : undefined,
        distanceText: item.distanceText,
      })),
    );
  } catch (error) {
    request.log.error(error);
    return reply.status(200).send([]); // Return empty results instead of 500 on suggestion failure
  }
}

export async function handleResolveSuggestion(
  request: FastifyRequest<{
    Body: {
      uri?: string;
      text?: string;
    };
  }>,
  reply: FastifyReply,
) {
  try {
    const result = await YandexMapsService.resolveSuggestion(request.body);

    return reply.send({
      title: result.title,
      address: result.address,
      pin: serializePoint(result.pin),
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(400).send({ message: (error as Error).message });
  }
}

export async function handleReverseGeocode(
  request: FastifyRequest<{
    Body: {
      latitude: number;
      longitude: number;
    };
  }>,
  reply: FastifyReply,
) {
  try {
    const result = await YandexMapsService.reverseGeocode({
      latitude: request.body.latitude,
      longitude: request.body.longitude,
    });

    return reply.send(result);
  } catch (error) {
    request.log.error(error);
    return reply.send({ address: null });
  }
}

export async function handleGetRouteDetails(
  request: FastifyRequest<{
    Body: {
      from: { latitude: number; longitude: number };
      to: { latitude: number; longitude: number };
      mode?: 'driving' | 'walking' | 'bicycle' | 'scooter' | 'transit';
      traffic?: 'enabled' | 'disabled';
    };
  }>,
  reply: FastifyReply,
) {
  try {
    const route = await YandexMapsService.getRouteDetails(request.body.from, request.body.to, {
      mode: request.body.mode,
      traffic: request.body.traffic,
    });

    return reply.send({
      distanceMeters: route.distanceMeters,
      etaSeconds: route.etaSeconds,
      polyline: route.polyline.map(serializePoint),
      steps: route.steps.map((step) => ({
        instruction: step.instruction,
        distanceMeters: step.distanceMeters,
        etaSeconds: step.etaSeconds,
        action: step.action,
        street: step.street,
      })),
      source: 'yandex-router',
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(400).send({ message: (error as Error).message });
  }
}

export async function handleGetDistanceMatrix(
  request: FastifyRequest<{
    Body: {
      origins: Array<{ latitude: number; longitude: number }>;
      destinations: Array<{ latitude: number; longitude: number }>;
      mode?: 'driving' | 'walking' | 'bicycle' | 'scooter' | 'transit';
      traffic?: 'enabled' | 'disabled';
    };
  }>,
  reply: FastifyReply,
) {
  const matrix = await YandexMapsService.getDistanceMatrix(
    request.body.origins,
    request.body.destinations,
    {
      mode: request.body.mode,
      traffic: request.body.traffic,
    },
  );

  return reply.send({
    rows: matrix,
    source: 'yandex-distance-matrix',
  });
}
