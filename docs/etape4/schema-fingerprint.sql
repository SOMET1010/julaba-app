SELECT 'col:'||table_name||'.'||column_name||':'||data_type||':'||is_nullable AS s
    FROM information_schema.columns WHERE table_schema='public' AND table_name<>'migrations'
  UNION ALL
  SELECT 'con:'||conname||':'||contype::text||':'||conrelid::regclass::text
    FROM pg_constraint WHERE connamespace='public'::regnamespace AND conname<>'PK_8c82d7f526340ab734260ea46be'
  UNION ALL
  SELECT 'idx:'||indexname||':'||tablename FROM pg_indexes WHERE schemaname='public' AND tablename<>'migrations'
  UNION ALL
  SELECT 'view:'||table_name FROM information_schema.views WHERE table_schema='public'
  ORDER BY 1;
