const { PrismaClient } = require('@prisma/client');
(async function(){
  const p = new PrismaClient();
  try{
    const user = await p.user.findFirst({ where: { role: { not: 'ADMIN' } } });
    if(!user){ console.log('No non-admin user found'); process.exit(0);} 
    console.log('User before:', user.email, user.requirePasswordOnOpen);
    const updated = await p.user.update({ where: { id: user.id }, data: { requirePasswordOnOpen: !user.requirePasswordOnOpen }, select: { email:true, requirePasswordOnOpen:true } });
    console.log('User after:', updated.email, updated.requirePasswordOnOpen);
  }catch(e){ console.error('ERR', e.message); process.exit(1);} finally{ await p.$disconnect(); }
})();
