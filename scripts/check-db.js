const { PrismaClient } = require('@prisma/client');
(async function(){
  const p = new PrismaClient();
  try{
    const u = await p.user.count();
    const b = await p.financeBook.count();
    const t = await p.transaction.count();
    console.log('USERS:'+u);
    console.log('BOOKS:'+b);
    console.log('TRANSACTIONS:'+t);
  }catch(e){
    console.error('ERR', e.message);
    process.exit(1);
  }finally{
    await p.$disconnect();
  }
})();
