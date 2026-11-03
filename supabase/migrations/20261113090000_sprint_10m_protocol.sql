-- 10 metre sprint test protokolü (süre; düşük değer iyidir)
insert into public.test_protocols (name, category, unit, description, is_active)
select '10m Sprint', 'Hız', 'saniye', 'Düz hat çıkış hızı testi. 10 metre maksimum hızda koşu; hızlanma (ilk adımlar) kapasitesini ölçer.', true
where not exists (select 1 from public.test_protocols where name = '10m Sprint');
