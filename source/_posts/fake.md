---
title: Fake data
date: 2023-01-02 12:56:31
tags: 
categories: Coding
---


当测试程序需要数据时，可以通过faker来构造测试数据



### 安装

```
$ pip install faker
```



### 基本使用

```
from faker import Faker
faker = Faker()
 
faker.name()
# 'Lucy Cechtelar'
 
faker.address()
# '426 Jordy Lodge
#  Cartwrightshire, SC 88120-6700'
 
faker.ipv4()
# '196.67.103.129'
```



对方法 [faker.](http://fake.name/)ipv4()的每次调用都会产生不同的随机结果

```
for _ in range(10):
  print(faker.ipv4())
 
# '120.36.235.152'
# '16.58.6.69'
# '170.215.56.41'
# '135.217.158.192'
# '218.235.87.38'
# '175.80.75.73'
# '122.120.1.128'
# '99.91.143.38'
# '1.90.129.142'
# '184.148.193.249'
```

<!-- more -->

### 提供的providers

- [`faker.providers.address`](https://faker.readthedocs.io/en/master/providers/faker.providers.address.html)
- [`faker.providers.automotive`](https://faker.readthedocs.io/en/master/providers/faker.providers.automotive.html)
- [`faker.providers.bank`](https://faker.readthedocs.io/en/master/providers/faker.providers.bank.html)
- [`faker.providers.barcode`](https://faker.readthedocs.io/en/master/providers/faker.providers.barcode.html)
- [`faker.providers.color`](https://faker.readthedocs.io/en/master/providers/faker.providers.color.html)
- [`faker.providers.company`](https://faker.readthedocs.io/en/master/providers/faker.providers.company.html)
- [`faker.providers.credit_card`](https://faker.readthedocs.io/en/master/providers/faker.providers.credit_card.html)
- [`faker.providers.currency`](https://faker.readthedocs.io/en/master/providers/faker.providers.currency.html)
- [`faker.providers.date_time`](https://faker.readthedocs.io/en/master/providers/faker.providers.date_time.html)
- [`faker.providers.emoji`](https://faker.readthedocs.io/en/master/providers/faker.providers.emoji.html)
- [`faker.providers.file`](https://faker.readthedocs.io/en/master/providers/faker.providers.file.html)
- [`faker.providers.geo`](https://faker.readthedocs.io/en/master/providers/faker.providers.geo.html)
- [`faker.providers.internet`](https://faker.readthedocs.io/en/master/providers/faker.providers.internet.html)
- [`faker.providers.isbn`](https://faker.readthedocs.io/en/master/providers/faker.providers.isbn.html)
- [`faker.providers.job`](https://faker.readthedocs.io/en/master/providers/faker.providers.job.html)
- [`faker.providers.lorem`](https://faker.readthedocs.io/en/master/providers/faker.providers.lorem.html)
- [`faker.providers.misc`](https://faker.readthedocs.io/en/master/providers/faker.providers.misc.html)
- [`faker.providers.passport`](https://faker.readthedocs.io/en/master/providers/faker.providers.passport.html)
- [`faker.providers.person`](https://faker.readthedocs.io/en/master/providers/faker.providers.person.html)
- [`faker.providers.phone_number`](https://faker.readthedocs.io/en/master/providers/faker.providers.phone_number.html)
- [`faker.providers.profile`](https://faker.readthedocs.io/en/master/providers/faker.providers.profile.html)
- [`faker.providers.python`](https://faker.readthedocs.io/en/master/providers/faker.providers.python.html)
- [`faker.providers.sbn`](https://faker.readthedocs.io/en/master/providers/faker.providers.sbn.html)
- [`faker.providers.ssn`](https://faker.readthedocs.io/en/master/providers/faker.providers.ssn.html)
- [`faker.providers.user_agent`](https://faker.readthedocs.io/en/master/providers/faker.providers.user_agent.html)



### 创建自定义的provider

对于一个枚举类型，可以创建自定义的provider

```
from enum import Enum
from faker import Faker
from faker.providers import DynamicProvider
 
class Country(Enum):
    CHINA = "china"
    AMERICA = "america"
     
country_provider = DynamicProvider(
    provider_name="country",
    elements=Country,
)
 
faker = Faker()
faker.add_provider(country_provider)
 
faker.country()
# <Country.CHINA: 'chian'>
```



# 构造数据

可以根据不同的列名，获取对应的provider_name，然后通过getattr(faker, provider_name)()调用后获取数据

例如

- 如果列名为src_ip或dst_ip，都调用ipv4()这个provider
- 如果列名为created_at或updated_at，都调用data_time_this_year()这个provider

```
fake_provider_alias = {
    "phone_number": ["tel", "phone_number"],
    "date_time_this_year": ["timestamp", "created_at", "updated_at"],
    "ipv4": ["src_ip", "dest_ip", "dst_ip"],
    "random_int": ["flow_id"],
    "country": ["country"],
    "name": ["name"]
}
 
def _get_provider_name(col_name):
    for provider, aliases in fake_provider_alias.items():
        if col_name in aliases:
            return provider
 
    return "name"
 
 
for _ in range(100):
    Country(
        **{
            f.name: getattr(faker, _get_provider_name(f.name))()
            for f in Person._meta.get_fields()
            if f.name != "id"
        }
    ).save()
```
