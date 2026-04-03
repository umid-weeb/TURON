import { FastifyInstance } from 'fastify';
import {
  handleGetDistanceMatrix,
  handleGetRouteDetails,
  handleResolveSuggestion,
  handleReverseGeocode,
  handleSuggestAddresses,
} from './maps.controller.js';
import {
  MapDistanceMatrixSchema,
  MapResolveSuggestionSchema,
  MapReverseGeocodeSchema,
  MapRouteSchema,
  MapSuggestQuerySchema,
} from '../../utils/schemas.js';

export default async function mapRoutes(fastify: FastifyInstance) {
  fastify.get('/suggest', {
    schema: {
      querystring: MapSuggestQuerySchema,
    },
  }, handleSuggestAddresses);

  fastify.post('/resolve', {
    schema: {
      body: MapResolveSuggestionSchema,
    },
  }, handleResolveSuggestion);

  fastify.post('/reverse-geocode', {
    schema: {
      body: MapReverseGeocodeSchema,
    },
  }, handleReverseGeocode);

  fastify.post('/route', {
    schema: {
      body: MapRouteSchema,
    },
  }, handleGetRouteDetails);

  fastify.post('/distance-matrix', {
    schema: {
      body: MapDistanceMatrixSchema,
    },
  }, handleGetDistanceMatrix);
}
