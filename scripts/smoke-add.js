const { PrismaClient } = require('@prisma/client');
(async function(){
  const p = new PrismaClient();
  try{
    const users = await p.user.findMany({ take: 1 });
    if(!users.length){ console.log('No users'); process.exit(0);}    
    const userId = users[0].id;
    console.log('Using user:', users[0].email || users[0].id);

    const personal = await p.financeBook.findFirst({ where: { type: 'PERSONAL' } });
    const shared = await p.financeBook.findFirst({ where: { type: 'SHARED' } });
    console.log('Personal book:', personal ? `${personal.id} - ${personal.name}` : 'none');
    console.log('Shared book:', shared ? `${shared.id} - ${shared.name}` : 'none');

    const now = new Date();
    if(personal){
      const tx = await p.transaction.create({ data: {
        amount: 50000,
        type: 'EXPENSE',
        description: 'Smoke test personal',
        date: now,
        dateKnown: true,
        originalDateText: now.toISOString().slice(0,10),
        financeBookId: personal.id,
        createdById: userId,
      }});
      console.log('Created personal tx id:', tx.id);
    }
    if(shared){
      const tx2 = await p.transaction.create({ data: {
        amount: 100000,
        type: 'EXPENSE',
        description: 'Smoke test shared',
        date: now,
        dateKnown: true,
        originalDateText: now.toISOString().slice(0,10),
        financeBookId: shared.id,
        createdById: userId,
      }});
      console.log('Created shared tx id:', tx2.id);

      // list budgets for shared book
      const budgets = await p.budget.findMany({ where: { financeBookId: shared.id } });
      console.log('Budgets for shared book:', budgets.length);
      budgets.forEach(b => console.log(`- ${b.name}: amount=${b.amount} alertAt=${b.alertAt}`));
    }

    // Check admin requirePasswordOnOpen for first user
    const u = await p.user.findFirst({ select: { id:true, email:true, requirePasswordOnOpen:true } });
    console.log('User requirePasswordOnOpen:', u.requirePasswordOnOpen);

  }catch(e){
    console.error('ERR', e.message);
    process.exit(1);
  }finally{
    await p.$disconnect();
  }
})();
