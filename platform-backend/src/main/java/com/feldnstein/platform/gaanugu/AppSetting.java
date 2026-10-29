package com.feldnstein.platform.gaanugu;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;

@Entity
@Table(name = "app_setting")
public class AppSetting extends PanacheEntity {

    public enum ValueType { STRING, INTEGER, DECIMAL, BOOLEAN }

    @Column(name = "setting_key", nullable = false, unique = true, length = 64)
    public String settingKey;

    @Column(name = "setting_value", length = 500)
    public String settingValue;

    @Enumerated(EnumType.STRING)
    @Column(name = "value_type", nullable = false, length = 16)
    public ValueType valueType = ValueType.STRING;

    @Column(length = 500)
    public String description;
}
