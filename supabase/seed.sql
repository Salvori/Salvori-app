-- Datos de prueba de staging: los 6 negocios del prototipo de Lovable.
-- Todo lleva es_prueba = true, así que nunca aparece en el catálogo público.
-- Es idempotente: al correrlo otra vez, las ofertas vuelven a tener ventana de hoy.
-- Los 3 usuarios de prueba NO van aquí (sus contraseñas no se commitean):
-- se crean con `npm run usuarios:prueba` (scripts/usuarios-prueba.mjs).

INSERT INTO public.negocios (id, nombre, slug, categoria, descripcion, direccion, lat, lng, horario, activo, es_prueba)
VALUES
  ('5a1a0000-0000-4000-8000-000000000001', 'La Fonda Payanesa', 'la-fonda-payanesa', 'almuerzo',
   'Almuerzos caseros payaneses.', 'Centro, Popayán', 2.4419, -76.6063, '{"lun-sab": "11:30-15:00"}', true, true),
  ('5a1a0000-0000-4000-8000-000000000002', 'Panadería El Morro', 'panaderia-el-morro', 'panaderia_pasteleria',
   'Pan de bono y panadería del día.', 'Barrio El Morro, Popayán', 2.4448, -76.6015, '{"lun-dom": "06:00-19:00"}', true, true),
  ('5a1a0000-0000-4000-8000-000000000003', 'Empanadas de Pipián Doña Rosa', 'empanadas-de-pipian-dona-rosa', 'comida_rapida',
   'Empanadas de pipián con ají de maní.', 'Centro, Popayán', 2.4392, -76.6101, '{"lun-dom": "08:00-18:00"}', true, true),
  ('5a1a0000-0000-4000-8000-000000000004', 'Sushi Calle 5', 'sushi-calle-5', 'otro',
   'Sushi y rolls.', 'Calle 5, Popayán', 2.4475, -76.5982, '{"mar-dom": "12:00-21:30"}', true, true),
  ('5a1a0000-0000-4000-8000-000000000005', 'Café Caldas', 'cafe-caldas', 'cafe',
   'Café de origen caucano y tortas de la casa.', 'Parque Caldas, Popayán', 2.4431, -76.6122, '{"lun-dom": "07:00-20:00"}', true, true),
  ('5a1a0000-0000-4000-8000-000000000006', 'Pizzería Belalcázar', 'pizzeria-belalcazar', 'comida_rapida',
   'Pizza artesanal al horno.', 'Sector Belalcázar, Popayán', 2.4502, -76.6058, '{"lun-dom": "12:00-22:00"}', true, true)
ON CONFLICT (id) DO NOTHING;

-- Ventana de hoy en hora de Colombia: desde las 06:00 hasta la hora del prototipo.
WITH hoy AS (SELECT (now() AT TIME ZONE 'America/Bogota')::date AS d),
datos (id, negocio_id, titulo, contenido, categoria, slug, precio_habitual, precio_final, cupos, hasta, prep) AS (
  VALUES
    ('5a1a0000-0000-4000-8000-0000000000a1'::uuid, '5a1a0000-0000-4000-8000-000000000001'::uuid,
     'Almuerzo del día con sopa', 'Sopa del día, seco (arroz, proteína, principio y ensalada) y jugo natural.',
     'almuerzo'::public.categoria, 'la-fonda-payanesa', 18000, 12000, 8, time '15:00', 10),
    ('5a1a0000-0000-4000-8000-0000000000a2', '5a1a0000-0000-4000-8000-000000000002',
     'Combo 6 panes de bono', '6 panes de bono medianos horneados hoy.',
     'panaderia_pasteleria', 'panaderia-el-morro', 9000, 6000, 10, time '19:00', 0),
    ('5a1a0000-0000-4000-8000-0000000000a3', '5a1a0000-0000-4000-8000-000000000003',
     '10 empanadas de pipián', '10 empanadas de pipián con ají de maní para llevar.',
     'comida_rapida', 'empanadas-de-pipian-dona-rosa', 15000, 10000, 6, time '18:00', 15),
    ('5a1a0000-0000-4000-8000-0000000000a4', '5a1a0000-0000-4000-8000-000000000004',
     'Roll del chef x2', '2 rolls del chef (10 piezas cada uno) con salsa soya y jengibre.',
     'otro', 'sushi-calle-5', 40000, 28000, 4, time '21:30', 20),
    ('5a1a0000-0000-4000-8000-0000000000a5', '5a1a0000-0000-4000-8000-000000000005',
     'Café + torta de la casa', 'Un café americano o capuchino y una porción de torta de la casa.',
     'cafe', 'cafe-caldas', 12500, 8000, 12, time '20:00', 5),
    ('5a1a0000-0000-4000-8000-0000000000a6', '5a1a0000-0000-4000-8000-000000000006',
     'Pizza mediana fin de día', 'Una pizza mediana de 8 porciones (hawaiana o pepperoni).',
     'comida_rapida', 'pizzeria-belalcazar', 32000, 19000, 5, time '22:00', 20)
)
INSERT INTO public.ofertas (id, negocio_id, tipo, titulo, contenido, categoria, foto_url,
  precio_habitual, precio_final, cupos_total, cupos_disponibles, recogida_desde, recogida_hasta,
  tiempo_preparacion_min, estado, es_prueba)
SELECT d.id, d.negocio_id, 'comercial', d.titulo, d.contenido, d.categoria,
  d.negocio_id || '/prueba-' || d.slug || '.jpg',
  d.precio_habitual, d.precio_final, d.cupos, d.cupos,
  (hoy.d + time '06:00') AT TIME ZONE 'America/Bogota',
  (hoy.d + d.hasta) AT TIME ZONE 'America/Bogota',
  d.prep, 'activa', true
FROM datos d CROSS JOIN hoy
ON CONFLICT (id) DO UPDATE
SET recogida_desde = EXCLUDED.recogida_desde,
    recogida_hasta = EXCLUDED.recogida_hasta,
    estado = CASE WHEN public.ofertas.cupos_disponibles > 0 THEN 'activa'::public.estado_oferta ELSE 'agotada'::public.estado_oferta END;
