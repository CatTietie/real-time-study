import Professional from "../models/professional.model";
import Category from "../models/category.model";
import QuestionBank from "../models/question-bank.model";
import Question from "../models/question.model";

export const seedQuestionBank = async () => {
  let created = 0;
  let skipped = 0;

  // 检查是否已有数据
  const existingCount = await Professional.count();
  if (existingCount > 0) {
    console.log("Question bank data already seeded, skipping...");
    return { created: 0, skipped: 1 };
  }

  // ===== 1. 插入专业 =====
  const professionals = await Professional.bulkCreate([
    { name: "计算机类", description: "计算机科学与技术相关专业", sort_order: 1 },
    { name: "电子商务类", description: "电子商务与网络营销相关专业", sort_order: 2 },
    { name: "数学类", description: "数学与应用数学相关专业", sort_order: 3 },
    { name: "英语类", description: "英语与翻译相关专业", sort_order: 4 },
  ]);
  created += professionals.length;

  const [cs, ecommerce, math, english] = professionals;

  // ===== 2. 插入分类（树形结构） =====
  // 计算机类子分类
  const csCategories = await Category.bulkCreate([
    { professional_id: cs.id, name: "编程语言", description: "各类编程语言基础", sort_order: 1 },
    { professional_id: cs.id, name: "数据结构与算法", description: "数据结构和算法设计", sort_order: 2 },
    { professional_id: cs.id, name: "数据库", description: "数据库原理与应用", sort_order: 3 },
    { professional_id: cs.id, name: "计算机网络", description: "网络协议与通信", sort_order: 4 },
    { professional_id: cs.id, name: "操作系统", description: "操作系统原理", sort_order: 5 },
  ]);
  created += csCategories.length;

  // 编程语言子分类
  const [progLang] = csCategories;
  const progLangChildren = await Category.bulkCreate([
    { professional_id: cs.id, parent_id: progLang.id, name: "Java", description: "Java编程语言", sort_order: 1 },
    { professional_id: cs.id, parent_id: progLang.id, name: "Python", description: "Python编程语言", sort_order: 2 },
    { professional_id: cs.id, parent_id: progLang.id, name: "C/C++", description: "C和C++编程语言", sort_order: 3 },
    { professional_id: cs.id, parent_id: progLang.id, name: "JavaScript", description: "JavaScript前端开发", sort_order: 4 },
  ]);
  created += progLangChildren.length;

  // 电商类子分类
  const ecomCategories = await Category.bulkCreate([
    { professional_id: ecommerce.id, name: "电子商务基础", description: "电商概论与模式", sort_order: 1 },
    { professional_id: ecommerce.id, name: "网络营销", description: "网络营销策略与实操", sort_order: 2 },
    { professional_id: ecommerce.id, name: "跨境电商", description: "跨境电商运营", sort_order: 3 },
  ]);
  created += ecomCategories.length;

  // 数学类子分类
  const mathCategories = await Category.bulkCreate([
    { professional_id: math.id, name: "高等数学", description: "微积分与线性代数", sort_order: 1 },
    { professional_id: math.id, name: "概率统计", description: "概率论与数理统计", sort_order: 2 },
  ]);
  created += mathCategories.length;

  // 英语类子分类
  const engCategories = await Category.bulkCreate([
    { professional_id: english.id, name: "大学英语四级", description: "CET-4考试", sort_order: 1 },
    { professional_id: english.id, name: "大学英语六级", description: "CET-6考试", sort_order: 2 },
  ]);
  created += engCategories.length;

  // ===== 3. 插入题库 =====
  const [javaCategory, pythonCategory] = progLangChildren;
  const [dsCategory, dbCategory, networkCategory] = csCategories.slice(1);

  const questionBanks = await QuestionBank.bulkCreate([
    { name: "Java基础入门题库", category_id: javaCategory.id, description: "Java语法、面向对象、集合框架等基础知识", question_count: 10, difficulty: 2.5, rating: 4.8 },
    { name: "Python编程基础", category_id: pythonCategory.id, description: "Python基础语法、数据类型、函数等", question_count: 10, difficulty: 2.0, rating: 4.9 },
    { name: "数据结构期末复习", category_id: dsCategory.id, description: "链表、树、图、排序算法综合", question_count: 10, difficulty: 3.5, rating: 4.5 },
    { name: "MySQL数据库基础", category_id: dbCategory.id, description: "SQL语法、表设计、索引优化", question_count: 5, difficulty: 3.0, rating: 4.6 },
    { name: "计算机网络概论", category_id: networkCategory.id, description: "TCP/IP、HTTP、DNS等网络协议", question_count: 5, difficulty: 3.0, rating: 4.7 },
    { name: "电商基础知识测试", category_id: ecomCategories[0].id, description: "电子商务模式、支付、物流", question_count: 5, difficulty: 2.0, rating: 4.4 },
  ]);
  created += questionBanks.length;

  // ===== 4. 插入题目 =====
  const [javaBank, pythonBank, dsBank, mysqlBank, networkBank, ecomBank] = questionBanks;

  const questions = await Question.bulkCreate([
    // Java题目
    { bank_id: javaBank.id, type: 1, content: "Java中哪个关键字用于定义类？", options: JSON.stringify([{label:"A",text:"class"},{label:"B",text:"struct"},{label:"C",text:"define"},{label:"D",text:"type"}]), answer: "A", score: 2, difficulty: 1, tags: '["Java基础","关键字"]', analysis: "Java使用class关键字来定义类，这是面向对象编程的基础语法。" },
    { bank_id: javaBank.id, type: 1, content: "下列哪个不是Java的基本数据类型？", options: JSON.stringify([{label:"A",text:"int"},{label:"B",text:"String"},{label:"C",text:"double"},{label:"D",text:"boolean"}]), answer: "B", score: 2, difficulty: 1, tags: '["Java基础","数据类型"]', analysis: "String是引用类型，不是基本数据类型。Java的8种基本类型为：byte, short, int, long, float, double, char, boolean。" },
    { bank_id: javaBank.id, type: 2, content: "以下哪些是Java集合框架中的接口？（多选）", options: JSON.stringify([{label:"A",text:"List"},{label:"B",text:"Map"},{label:"C",text:"ArrayList"},{label:"D",text:"Set"}]), answer: "A,B,D", score: 3, difficulty: 3, tags: '["集合框架"]', analysis: "List、Map、Set是接口，ArrayList是List接口的实现类。" },
    { bank_id: javaBank.id, type: 3, content: "Java支持多重继承。", options: JSON.stringify([{label:"A",text:"正确"},{label:"B",text:"错误"}]), answer: "B", score: 2, difficulty: 2, tags: '["面向对象","继承"]', analysis: "Java不支持类的多重继承，但支持接口的多重实现。" },
    { bank_id: javaBank.id, type: 4, content: "Java中，所有类的根父类是______类。", options: null, answer: "Object", score: 2, difficulty: 2, tags: '["面向对象"]', analysis: "Object类是Java中所有类的终极父类。" },

    // Python题目
    { bank_id: pythonBank.id, type: 1, content: "Python中哪个函数用于获取列表长度？", options: JSON.stringify([{label:"A",text:"size()"},{label:"B",text:"length()"},{label:"C",text:"len()"},{label:"D",text:"count()"}]), answer: "C", score: 2, difficulty: 1, tags: '["Python基础","内置函数"]', analysis: "len()是Python的内置函数，用于返回对象的长度。" },
    { bank_id: pythonBank.id, type: 1, content: "以下哪个是Python中的不可变数据类型？", options: JSON.stringify([{label:"A",text:"list"},{label:"B",text:"dict"},{label:"C",text:"set"},{label:"D",text:"tuple"}]), answer: "D", score: 2, difficulty: 2, tags: '["数据类型"]', analysis: "tuple（元组）一旦创建就不能修改，是不可变类型。list、dict、set都是可变类型。" },
    { bank_id: pythonBank.id, type: 3, content: "Python中的缩进是可选的，仅用于美化代码。", options: JSON.stringify([{label:"A",text:"正确"},{label:"B",text:"错误"}]), answer: "B", score: 2, difficulty: 1, tags: '["Python基础","语法"]', analysis: "Python使用缩进来表示代码块，缩进是语法的一部分，不是可选的。" },
    { bank_id: pythonBank.id, type: 4, content: "Python中用于定义函数的关键字是______。", options: null, answer: "def", score: 2, difficulty: 1, tags: '["函数"]', analysis: "Python使用def关键字来定义函数。" },
    { bank_id: pythonBank.id, type: 5, content: "请简述Python中列表推导式的用法，并举一个例子。", options: null, answer: "列表推导式是Python中创建列表的简洁方式，语法为[expression for item in iterable if condition]。例如：squares = [x**2 for x in range(10)]", score: 5, difficulty: 3, tags: '["列表","高级特性"]', analysis: "列表推导式将for循环和条件判断结合在一行中，生成新列表。" },

    // 数据结构题目
    { bank_id: dsBank.id, type: 1, content: "在一个长度为n的顺序表中，删除第i个元素需要移动多少个元素？", options: JSON.stringify([{label:"A",text:"n-i"},{label:"B",text:"n-i+1"},{label:"C",text:"n-i-1"},{label:"D",text:"i"}]), answer: "A", score: 2, difficulty: 3, tags: '["线性表"]', analysis: "删除第i个元素后，其后的n-i个元素都需要前移一位。" },
    { bank_id: dsBank.id, type: 1, content: "二叉树的中序遍历序列为DBEAFCG，后序遍历序列为DEBFGCA，则前序遍历序列为：", options: JSON.stringify([{label:"A",text:"ABCDEFG"},{label:"B",text:"ABDECFG"},{label:"C",text:"ABDEFCG"},{label:"D",text:"ADBECFG"}]), answer: "B", score: 3, difficulty: 4, tags: '["二叉树","遍历"]', analysis: "由后序遍历最后一个元素A为根，在中序遍历中找到A，左子树DBE，右子树FCG，递归重建。" },
    { bank_id: dsBank.id, type: 1, content: "下列排序算法中，最坏情况时间复杂度为O(nlogn)的是：", options: JSON.stringify([{label:"A",text:"快速排序"},{label:"B",text:"堆排序"},{label:"C",text:"冒泡排序"},{label:"D",text:"插入排序"}]), answer: "B", score: 2, difficulty: 3, tags: '["排序算法","时间复杂度"]', analysis: "堆排序在最好、最坏、平均情况下的时间复杂度都是O(nlogn)。快速排序最坏为O(n²)。" },
    { bank_id: dsBank.id, type: 3, content: "栈是一种先进先出(FIFO)的数据结构。", options: JSON.stringify([{label:"A",text:"正确"},{label:"B",text:"错误"}]), answer: "B", score: 2, difficulty: 1, tags: '["栈"]', analysis: "栈是后进先出(LIFO)的数据结构，队列才是先进先出(FIFO)。" },
    { bank_id: dsBank.id, type: 4, content: "哈希表解决冲突的两种主要方法是开放地址法和______法。", options: null, answer: "链地址", score: 2, difficulty: 3, tags: '["哈希表"]', analysis: "哈希冲突的两种主要解决方法：开放地址法（线性探测、二次探测等）和链地址法（拉链法）。" },

    // MySQL题目
    { bank_id: mysqlBank.id, type: 1, content: "SQL中用于查询数据的关键字是：", options: JSON.stringify([{label:"A",text:"INSERT"},{label:"B",text:"UPDATE"},{label:"C",text:"SELECT"},{label:"D",text:"DELETE"}]), answer: "C", score: 2, difficulty: 1, tags: '["SQL基础"]', analysis: "SELECT用于查询，INSERT插入，UPDATE更新，DELETE删除。" },
    { bank_id: mysqlBank.id, type: 2, content: "以下哪些是MySQL的约束？（多选）", options: JSON.stringify([{label:"A",text:"PRIMARY KEY"},{label:"B",text:"FOREIGN KEY"},{label:"C",text:"UNIQUE"},{label:"D",text:"INDEX"}]), answer: "A,B,C", score: 3, difficulty: 2, tags: '["约束"]', analysis: "PRIMARY KEY、FOREIGN KEY、UNIQUE都是约束，INDEX是索引不是约束。" },
    { bank_id: mysqlBank.id, type: 1, content: "在MySQL中，哪个聚合函数用于计算平均值？", options: JSON.stringify([{label:"A",text:"SUM()"},{label:"B",text:"COUNT()"},{label:"C",text:"AVG()"},{label:"D",text:"MAX()"}]), answer: "C", score: 2, difficulty: 1, tags: '["聚合函数"]', analysis: "AVG()计算平均值，SUM()求和，COUNT()计数，MAX()求最大值。" },
    { bank_id: mysqlBank.id, type: 4, content: "SQL中用于对分组后的结果进行过滤的子句是______。", options: null, answer: "HAVING", score: 2, difficulty: 2, tags: '["分组查询"]', analysis: "HAVING子句用于过滤分组后的结果，WHERE用于过滤分组前的记录。" },
    { bank_id: mysqlBank.id, type: 3, content: "MySQL中，INNER JOIN和CROSS JOIN的功能完全相同。", options: JSON.stringify([{label:"A",text:"正确"},{label:"B",text:"错误"}]), answer: "B", score: 2, difficulty: 3, tags: '["连接查询"]', analysis: "INNER JOIN需要连接条件，返回两个表中满足条件的行；CROSS JOIN返回笛卡尔积。" },

    // 计算机网络题目
    { bank_id: networkBank.id, type: 1, content: "HTTP协议默认使用的端口号是：", options: JSON.stringify([{label:"A",text:"21"},{label:"B",text:"22"},{label:"C",text:"80"},{label:"D",text:"443"}]), answer: "C", score: 2, difficulty: 1, tags: '["HTTP","端口"]', analysis: "HTTP默认端口80，HTTPS默认443，FTP默认21，SSH默认22。" },
    { bank_id: networkBank.id, type: 1, content: "TCP协议属于OSI模型的哪一层？", options: JSON.stringify([{label:"A",text:"网络层"},{label:"B",text:"传输层"},{label:"C",text:"会话层"},{label:"D",text:"应用层"}]), answer: "B", score: 2, difficulty: 2, tags: '["OSI模型","TCP"]', analysis: "TCP和UDP都属于传输层协议，IP属于网络层。" },
    { bank_id: networkBank.id, type: 3, content: "UDP协议是面向连接的可靠传输协议。", options: JSON.stringify([{label:"A",text:"正确"},{label:"B",text:"错误"}]), answer: "B", score: 2, difficulty: 1, tags: '["UDP"]', analysis: "UDP是无连接的不可靠传输协议，TCP才是面向连接的可靠传输协议。" },
    { bank_id: networkBank.id, type: 2, content: "以下哪些属于应用层协议？（多选）", options: JSON.stringify([{label:"A",text:"HTTP"},{label:"B",text:"FTP"},{label:"C",text:"TCP"},{label:"D",text:"DNS"}]), answer: "A,B,D", score: 3, difficulty: 2, tags: '["应用层","协议"]', analysis: "HTTP、FTP、DNS都是应用层协议。TCP是传输层协议。" },
    { bank_id: networkBank.id, type: 4, content: "IP地址192.168.1.0/24中，子网掩码为______。", options: null, answer: "255.255.255.0", score: 2, difficulty: 2, tags: '["IP地址","子网"]', analysis: "/24表示前24位为网络位，即子网掩码为255.255.255.0。" },

    // 电商基础题目
    { bank_id: ecomBank.id, type: 1, content: "B2C电子商务模式是指：", options: JSON.stringify([{label:"A",text:"企业对企业"},{label:"B",text:"企业对消费者"},{label:"C",text:"消费者对消费者"},{label:"D",text:"政府对企业"}]), answer: "B", score: 2, difficulty: 1, tags: '["电商模式"]', analysis: "B2C即Business to Consumer，企业对消费者。B2B是企业对企业，C2C是消费者对消费者。" },
    { bank_id: ecomBank.id, type: 1, content: "以下哪个平台主要采用C2C模式？", options: JSON.stringify([{label:"A",text:"京东自营"},{label:"B",text:"天猫"},{label:"C",text:"闲鱼"},{label:"D",text:"网易严选"}]), answer: "C", score: 2, difficulty: 1, tags: '["电商平台","电商模式"]', analysis: "闲鱼是二手交易平台，主要为个人对个人（C2C）模式。" },
    { bank_id: ecomBank.id, type: 3, content: "SEO是指通过付费广告来提高网站在搜索引擎中的排名。", options: JSON.stringify([{label:"A",text:"正确"},{label:"B",text:"错误"}]), answer: "B", score: 2, difficulty: 2, tags: '["网络营销","SEO"]', analysis: "SEO（搜索引擎优化）是通过非付费手段提高排名。付费排名属于SEM（搜索引擎营销）。" },
    { bank_id: ecomBank.id, type: 2, content: "电子商务的支付方式包括以下哪些？（多选）", options: JSON.stringify([{label:"A",text:"支付宝"},{label:"B",text:"微信支付"},{label:"C",text:"银行转账"},{label:"D",text:"货到付款"}]), answer: "A,B,C,D", score: 3, difficulty: 1, tags: '["支付"]', analysis: "以上都是电子商务中常见的支付方式。" },
    { bank_id: ecomBank.id, type: 4, content: "电子商务中，SKU的全称是Stock Keeping ______。", options: null, answer: "Unit", score: 2, difficulty: 2, tags: '["电商概念"]', analysis: "SKU = Stock Keeping Unit，库存量单位，是商品管理的最小单位。" },
  ]);
  created += questions.length;

  console.log(`Question bank seed: ${created} records created`);
  return { created, skipped };
};
