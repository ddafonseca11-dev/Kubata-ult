/* Kubata Kié — sample listings inspired by the Kubata Baía presentation. */
DO $$
DECLARE owner uuid; existing integer;
BEGIN
  SELECT id INTO owner FROM auth.users ORDER BY created_at LIMIT 1;
  IF owner IS NULL THEN
    RAISE NOTICE 'No auth user exists yet; sample listings will be available in the frontend demo fallback.';
    RETURN;
  END IF;
  SELECT count(*) INTO existing FROM public.properties WHERE title LIKE '[DEMO] %';
  IF existing > 0 THEN RETURN; END IF;
  INSERT INTO public.properties(owner_id,title,description,price,currency,property_type,transaction_type,status,bedrooms,bathrooms,area,land_area,address,city,region,country,features,is_featured,views_count)
  VALUES
  (owner,'[DEMO] Vivenda contemporânea com piscina em Talatona','Exemplo editorial Kubata Kié.',125000000,'AOA','house','sale','published',4,4,360,600,'Talatona','Luanda','Luanda','Angola','{"pool":true,"security":true}',true,428),
  (owner,'[DEMO] Apartamento T3 premium em Miramar','Exemplo editorial Kubata Kié.',85000000,'AOA','apartment','sale','published',3,3,190,NULL,'Miramar','Luanda','Luanda','Angola','{"balcony":true,"parking":true}',true,315),
  (owner,'[DEMO] Moradia T4 mobilada para arrendamento','Exemplo editorial Kubata Kié.',2200000,'AOA','house','rent','published',4,4,280,500,'Benfica','Luanda','Luanda','Angola','{"furnished":true,"generator":true}',true,289),
  (owner,'[DEMO] Terreno residencial para investimento','Exemplo editorial Kubata Kié.',32000000,'AOA','land','sale','published',NULL,NULL,1000,1000,'Belas','Luanda','Luanda','Angola','{"water":true,"electricity":true}',false,201),
  (owner,'[DEMO] Espaço comercial na avenida principal','Exemplo editorial Kubata Kié.',65000000,'AOA','commercial','sale','published',NULL,2,240,NULL,'Maianga','Luanda','Luanda','Angola','{"parking":true,"security":true}',false,176),
  (owner,'[DEMO] Escritório moderno para arrendamento','Exemplo editorial Kubata Kié.',1200000,'AOA','office','rent','published',NULL,2,150,NULL,'Ingombota','Luanda','Luanda','Angola','{"internet":true,"security":true}',false,143);
END $$;
