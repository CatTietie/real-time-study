-- ============================================================
-- 题库系统初始数据 SQL 脚本
-- 数据库: study_platform
-- 执行前请确保已运行应用创建了表结构（sequelize sync）
-- ============================================================

-- 插入专业
INSERT INTO professionals (name, description, sort_order, status, created_at, updated_at) VALUES
('计算机类', '计算机科学与技术相关专业', 1, 1, NOW(), NOW()),
('电子商务类', '电子商务与网络营销相关专业', 2, 1, NOW(), NOW()),
('数学类', '数学与应用数学相关专业', 3, 1, NOW(), NOW()),
('英语类', '英语与翻译相关专业', 4, 1, NOW(), NOW());

-- 插入分类（计算机类）
INSERT INTO categories (professional_id, parent_id, name, description, sort_order, status, created_at, updated_at) VALUES
(1, NULL, '编程语言', '各类编程语言基础', 1, 1, NOW(), NOW()),
(1, NULL, '数据结构与算法', '数据结构和算法设计', 2, 1, NOW(), NOW()),
(1, NULL, '数据库', '数据库原理与应用', 3, 1, NOW(), NOW()),
(1, NULL, '计算机网络', '网络协议与通信', 4, 1, NOW(), NOW()),
(1, NULL, '操作系统', '操作系统原理', 5, 1, NOW(), NOW());

-- 编程语言子分类（parent_id=1 假设编程语言ID为1）
INSERT INTO categories (professional_id, parent_id, name, description, sort_order, status, created_at, updated_at) VALUES
(1, 1, 'Java', 'Java编程语言', 1, 1, NOW(), NOW()),
(1, 1, 'Python', 'Python编程语言', 2, 1, NOW(), NOW()),
(1, 1, 'C/C++', 'C和C++编程语言', 3, 1, NOW(), NOW()),
(1, 1, 'JavaScript', 'JavaScript前端开发', 4, 1, NOW(), NOW());

-- 电商类子分类
INSERT INTO categories (professional_id, parent_id, name, description, sort_order, status, created_at, updated_at) VALUES
(2, NULL, '电子商务基础', '电商概论与模式', 1, 1, NOW(), NOW()),
(2, NULL, '网络营销', '网络营销策略与实操', 2, 1, NOW(), NOW()),
(2, NULL, '跨境电商', '跨境电商运营', 3, 1, NOW(), NOW());

-- 数学类子分类
INSERT INTO categories (professional_id, parent_id, name, description, sort_order, status, created_at, updated_at) VALUES
(3, NULL, '高等数学', '微积分与线性代数', 1, 1, NOW(), NOW()),
(3, NULL, '概率统计', '概率论与数理统计', 2, 1, NOW(), NOW());

-- 英语类子分类
INSERT INTO categories (professional_id, parent_id, name, description, sort_order, status, created_at, updated_at) VALUES
(4, NULL, '大学英语四级', 'CET-4考试', 1, 1, NOW(), NOW()),
(4, NULL, '大学英语六级', 'CET-6考试', 2, 1, NOW(), NOW());

-- 插入题库（category_id 依赖实际插入后的ID, 这里假设 Java=6, Python=7, 数据结构=2, 数据库=3, 网络=4, 电商基础=10）
INSERT INTO question_banks (name, category_id, description, question_count, difficulty, rating, status, created_at, updated_at) VALUES
('Java基础入门题库', 6, 'Java语法、面向对象、集合框架等基础知识', 5, 2.5, 4.8, 1, NOW(), NOW()),
('Python编程基础', 7, 'Python基础语法、数据类型、函数等', 5, 2.0, 4.9, 1, NOW(), NOW()),
('数据结构期末复习', 2, '链表、树、图、排序算法综合', 5, 3.5, 4.5, 1, NOW(), NOW()),
('MySQL数据库基础', 3, 'SQL语法、表设计、索引优化', 5, 3.0, 4.6, 1, NOW(), NOW()),
('计算机网络概论', 4, 'TCP/IP、HTTP、DNS等网络协议', 5, 3.0, 4.7, 1, NOW(), NOW()),
('电商基础知识测试', 10, '电子商务模式、支付、物流', 5, 2.0, 4.4, 1, NOW(), NOW());

-- 插入题目（bank_id 依赖实际插入后的ID, 这里假设从1开始）

-- Java题目 (bank_id = 1)
INSERT INTO questions (bank_id, type, content, options, answer, score, difficulty, tags, analysis, resource_url, allow_multiple_practice, status, created_at, updated_at) VALUES
(1, 1, 'Java中哪个关键字用于定义类？', '[{"label":"A","text":"class"},{"label":"B","text":"struct"},{"label":"C","text":"define"},{"label":"D","text":"type"}]', 'A', 2, 1, '["Java基础","关键字"]', 'Java使用class关键字来定义类，这是面向对象编程的基础语法。', NULL, 1, 1, NOW(), NOW()),
(1, 1, '下列哪个不是Java的基本数据类型？', '[{"label":"A","text":"int"},{"label":"B","text":"String"},{"label":"C","text":"double"},{"label":"D","text":"boolean"}]', 'B', 2, 1, '["Java基础","数据类型"]', 'String是引用类型，不是基本数据类型。Java的8种基本类型为：byte, short, int, long, float, double, char, boolean。', NULL, 1, 1, NOW(), NOW()),
(1, 2, '以下哪些是Java集合框架中的接口？（多选）', '[{"label":"A","text":"List"},{"label":"B","text":"Map"},{"label":"C","text":"ArrayList"},{"label":"D","text":"Set"}]', 'A,B,D', 3, 3, '["集合框架"]', 'List、Map、Set是接口，ArrayList是List接口的实现类。', NULL, 1, 1, NOW(), NOW()),
(1, 3, 'Java支持多重继承。', '[{"label":"A","text":"正确"},{"label":"B","text":"错误"}]', 'B', 2, 2, '["面向对象","继承"]', 'Java不支持类的多重继承，但支持接口的多重实现。', NULL, 1, 1, NOW(), NOW()),
(1, 4, 'Java中，所有类的根父类是______类。', NULL, 'Object', 2, 2, '["面向对象"]', 'Object类是Java中所有类的终极父类。', NULL, 1, 1, NOW(), NOW());

-- Python题目 (bank_id = 2)
INSERT INTO questions (bank_id, type, content, options, answer, score, difficulty, tags, analysis, resource_url, allow_multiple_practice, status, created_at, updated_at) VALUES
(2, 1, 'Python中哪个函数用于获取列表长度？', '[{"label":"A","text":"size()"},{"label":"B","text":"length()"},{"label":"C","text":"len()"},{"label":"D","text":"count()"}]', 'C', 2, 1, '["Python基础","内置函数"]', 'len()是Python的内置函数，用于返回对象的长度。', NULL, 1, 1, NOW(), NOW()),
(2, 1, '以下哪个是Python中的不可变数据类型？', '[{"label":"A","text":"list"},{"label":"B","text":"dict"},{"label":"C","text":"set"},{"label":"D","text":"tuple"}]', 'D', 2, 2, '["数据类型"]', 'tuple（元组）一旦创建就不能修改，是不可变类型。', NULL, 1, 1, NOW(), NOW()),
(2, 3, 'Python中的缩进是可选的，仅用于美化代码。', '[{"label":"A","text":"正确"},{"label":"B","text":"错误"}]', 'B', 2, 1, '["Python基础","语法"]', 'Python使用缩进来表示代码块，缩进是语法的一部分，不是可选的。', NULL, 1, 1, NOW(), NOW()),
(2, 4, 'Python中用于定义函数的关键字是______。', NULL, 'def', 2, 1, '["函数"]', 'Python使用def关键字来定义函数。', NULL, 1, 1, NOW(), NOW()),
(2, 5, '请简述Python中列表推导式的用法，并举一个例子。', NULL, '列表推导式是Python中创建列表的简洁方式，语法为[expression for item in iterable if condition]。例如：squares = [x**2 for x in range(10)]', 5, 3, '["列表","高级特性"]', '列表推导式将for循环和条件判断结合在一行中，生成新列表。', NULL, 1, 1, NOW(), NOW());

-- 数据结构题目 (bank_id = 3)
INSERT INTO questions (bank_id, type, content, options, answer, score, difficulty, tags, analysis, resource_url, allow_multiple_practice, status, created_at, updated_at) VALUES
(3, 1, '在一个长度为n的顺序表中，删除第i个元素需要移动多少个元素？', '[{"label":"A","text":"n-i"},{"label":"B","text":"n-i+1"},{"label":"C","text":"n-i-1"},{"label":"D","text":"i"}]', 'A', 2, 3, '["线性表"]', '删除第i个元素后，其后的n-i个元素都需要前移一位。', NULL, 1, 1, NOW(), NOW()),
(3, 1, '二叉树的中序遍历序列为DBEAFCG，后序遍历序列为DEBFGCA，则前序遍历序列为：', '[{"label":"A","text":"ABCDEFG"},{"label":"B","text":"ABDECFG"},{"label":"C","text":"ABDEFCG"},{"label":"D","text":"ADBECFG"}]', 'B', 3, 4, '["二叉树","遍历"]', '由后序遍历最后一个元素A为根，在中序遍历中找到A，左子树DBE，右子树FCG，递归重建。', NULL, 1, 1, NOW(), NOW()),
(3, 1, '下列排序算法中，最坏情况时间复杂度为O(nlogn)的是：', '[{"label":"A","text":"快速排序"},{"label":"B","text":"堆排序"},{"label":"C","text":"冒泡排序"},{"label":"D","text":"插入排序"}]', 'B', 2, 3, '["排序算法","时间复杂度"]', '堆排序在最好、最坏、平均情况下的时间复杂度都是O(nlogn)。', NULL, 1, 1, NOW(), NOW()),
(3, 3, '栈是一种先进先出(FIFO)的数据结构。', '[{"label":"A","text":"正确"},{"label":"B","text":"错误"}]', 'B', 2, 1, '["栈"]', '栈是后进先出(LIFO)的数据结构，队列才是先进先出(FIFO)。', NULL, 1, 1, NOW(), NOW()),
(3, 4, '哈希表解决冲突的两种主要方法是开放地址法和______法。', NULL, '链地址', 2, 3, '["哈希表"]', '哈希冲突的两种主要解决方法：开放地址法和链地址法（拉链法）。', NULL, 1, 1, NOW(), NOW());

-- MySQL题目 (bank_id = 4)
INSERT INTO questions (bank_id, type, content, options, answer, score, difficulty, tags, analysis, resource_url, allow_multiple_practice, status, created_at, updated_at) VALUES
(4, 1, 'SQL中用于查询数据的关键字是：', '[{"label":"A","text":"INSERT"},{"label":"B","text":"UPDATE"},{"label":"C","text":"SELECT"},{"label":"D","text":"DELETE"}]', 'C', 2, 1, '["SQL基础"]', 'SELECT用于查询，INSERT插入，UPDATE更新，DELETE删除。', NULL, 1, 1, NOW(), NOW()),
(4, 2, '以下哪些是MySQL的约束？（多选）', '[{"label":"A","text":"PRIMARY KEY"},{"label":"B","text":"FOREIGN KEY"},{"label":"C","text":"UNIQUE"},{"label":"D","text":"INDEX"}]', 'A,B,C', 3, 2, '["约束"]', 'PRIMARY KEY、FOREIGN KEY、UNIQUE都是约束，INDEX是索引不是约束。', NULL, 1, 1, NOW(), NOW()),
(4, 1, '在MySQL中，哪个聚合函数用于计算平均值？', '[{"label":"A","text":"SUM()"},{"label":"B","text":"COUNT()"},{"label":"C","text":"AVG()"},{"label":"D","text":"MAX()"}]', 'C', 2, 1, '["聚合函数"]', 'AVG()计算平均值，SUM()求和，COUNT()计数，MAX()求最大值。', NULL, 1, 1, NOW(), NOW()),
(4, 4, 'SQL中用于对分组后的结果进行过滤的子句是______。', NULL, 'HAVING', 2, 2, '["分组查询"]', 'HAVING子句用于过滤分组后的结果，WHERE用于过滤分组前的记录。', NULL, 1, 1, NOW(), NOW()),
(4, 3, 'MySQL中，INNER JOIN和CROSS JOIN的功能完全相同。', '[{"label":"A","text":"正确"},{"label":"B","text":"错误"}]', 'B', 2, 3, '["连接查询"]', 'INNER JOIN需要连接条件，返回两个表中满足条件的行；CROSS JOIN返回笛卡尔积。', NULL, 1, 1, NOW(), NOW());

-- 计算机网络题目 (bank_id = 5)
INSERT INTO questions (bank_id, type, content, options, answer, score, difficulty, tags, analysis, resource_url, allow_multiple_practice, status, created_at, updated_at) VALUES
(5, 1, 'HTTP协议默认使用的端口号是：', '[{"label":"A","text":"21"},{"label":"B","text":"22"},{"label":"C","text":"80"},{"label":"D","text":"443"}]', 'C', 2, 1, '["HTTP","端口"]', 'HTTP默认端口80，HTTPS默认443，FTP默认21，SSH默认22。', NULL, 1, 1, NOW(), NOW()),
(5, 1, 'TCP协议属于OSI模型的哪一层？', '[{"label":"A","text":"网络层"},{"label":"B","text":"传输层"},{"label":"C","text":"会话层"},{"label":"D","text":"应用层"}]', 'B', 2, 2, '["OSI模型","TCP"]', 'TCP和UDP都属于传输层协议，IP属于网络层。', NULL, 1, 1, NOW(), NOW()),
(5, 3, 'UDP协议是面向连接的可靠传输协议。', '[{"label":"A","text":"正确"},{"label":"B","text":"错误"}]', 'B', 2, 1, '["UDP"]', 'UDP是无连接的不可靠传输协议，TCP才是面向连接的可靠传输协议。', NULL, 1, 1, NOW(), NOW()),
(5, 2, '以下哪些属于应用层协议？（多选）', '[{"label":"A","text":"HTTP"},{"label":"B","text":"FTP"},{"label":"C","text":"TCP"},{"label":"D","text":"DNS"}]', 'A,B,D', 3, 2, '["应用层","协议"]', 'HTTP、FTP、DNS都是应用层协议。TCP是传输层协议。', NULL, 1, 1, NOW(), NOW()),
(5, 4, 'IP地址192.168.1.0/24中，子网掩码为______。', NULL, '255.255.255.0', 2, 2, '["IP地址","子网"]', '/24表示前24位为网络位，即子网掩码为255.255.255.0。', NULL, 1, 1, NOW(), NOW());

-- 电商基础题目 (bank_id = 6)
INSERT INTO questions (bank_id, type, content, options, answer, score, difficulty, tags, analysis, resource_url, allow_multiple_practice, status, created_at, updated_at) VALUES
(6, 1, 'B2C电子商务模式是指：', '[{"label":"A","text":"企业对企业"},{"label":"B","text":"企业对消费者"},{"label":"C","text":"消费者对消费者"},{"label":"D","text":"政府对企业"}]', 'B', 2, 1, '["电商模式"]', 'B2C即Business to Consumer，企业对消费者。', NULL, 1, 1, NOW(), NOW()),
(6, 1, '以下哪个平台主要采用C2C模式？', '[{"label":"A","text":"京东自营"},{"label":"B","text":"天猫"},{"label":"C","text":"闲鱼"},{"label":"D","text":"网易严选"}]', 'C', 2, 1, '["电商平台","电商模式"]', '闲鱼是二手交易平台，主要为个人对个人（C2C）模式。', NULL, 1, 1, NOW(), NOW()),
(6, 3, 'SEO是指通过付费广告来提高网站在搜索引擎中的排名。', '[{"label":"A","text":"正确"},{"label":"B","text":"错误"}]', 'B', 2, 2, '["网络营销","SEO"]', 'SEO是通过非付费手段提高排名。付费排名属于SEM。', NULL, 1, 1, NOW(), NOW()),
(6, 2, '电子商务的支付方式包括以下哪些？（多选）', '[{"label":"A","text":"支付宝"},{"label":"B","text":"微信支付"},{"label":"C","text":"银行转账"},{"label":"D","text":"货到付款"}]', 'A,B,C,D', 3, 1, '["支付"]', '以上都是电子商务中常见的支付方式。', NULL, 1, 1, NOW(), NOW()),
(6, 4, '电子商务中，SKU的全称是Stock Keeping ______。', NULL, 'Unit', 2, 2, '["电商概念"]', 'SKU = Stock Keeping Unit，库存量单位，是商品管理的最小单位。', NULL, 1, 1, NOW(), NOW());
